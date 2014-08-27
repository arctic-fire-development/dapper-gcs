'use strict';
/*global require, util, events, module */

/*
Waypoint manager, loads/clears mission items with UAV via MAVLink.

Sending parameters is done via MAVLink mission_item messages, here's a copy/paste of some docs:

Message encoding a mission item. This message is emitted to announce
the presence of a mission item and to set a mission item on the
system. The mission item can be either in x, y, z meters (type: LOCAL)
or x:lat, y:lon, z:altitude. Local frame is Z-down, right handed
(NED), global frame is Z-up, right handed (ENU). See also
http://qgroundcontrol.org/mavlink/waypoint_protocol.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Sequence (uint16_t)
                frame                     : The coordinate system of the MISSION. see MAV_FRAME in mavlink_types.h (uint8_t)
                command                   : The scheduled action for the MISSION. see MAV_CMD in common.xml MAVLink specs (uint16_t)
                current                   : false:0, true:1 (uint8_t)
                autocontinue              : autocontinue to next wp (uint8_t)
                param1                    : PARAM1 / For NAV command MISSIONs: Radius in which the MISSION is accepted as reached, in meters (float)
                param2                    : PARAM2 / For NAV command MISSIONs: Time that the MAV should stay inside the PARAM1 radius before advancing, in milliseconds (float)
                param3                    : PARAM3 / For LOITER command MISSIONs: Orbit to circle around the MISSION, in meters. If positive the orbit direction should be clockwise, if negative the orbit direction should be counter-clockwise. (float)
                param4                    : PARAM4 / For NAV and LOITER command MISSIONs: Yaw orientation in degrees, [0..360] 0 = NORTH (float)
                x                         : PARAM5 / local: x position, global: latitude (float)
                y                         : PARAM6 / y position: global: longitude (float)
                z                         : PARAM7 / z position: global: altitude (float)

Note that when we deal with QGC-formatted "waypoint file format", the order of the fields is slightly different.
http://qgroundcontrol.org/mavlink/waypoint_protocol#waypoint_file_format

QGC WPL <VERSION>
<INDEX> <CURRENT WP> <COORD FRAME> <COMMAND> <PARAM1> <PARAM2> <PARAM3> <PARAM4> <PARAM5/X/LONGITUDE> <PARAM6/Y/LATITUDE> <PARAM7/Z/ALTITUDE> <AUTOCONTINUE>

Another note to consider is how exactly these messages are interpreted by the APM.
A good spot in the source code to examine is in ardupilot/libraries/GCS_MAVLink/GCS_common.cpp, in

void GCS_MAVLINK::handle_mission_item(mavlink_message_t *msg, AP_Mission &mission)

There, we learn that the 'current' field has special meaning for APM.  See
the APM.mission_current enum below.

*/
var _ = require('underscore'),
    Q = require('q'),
    fs = require('fs'),
    moment = require('moment');

// Logging object (winston)
var log;

// Reference to the mavlink protocol object
var mavlink;

// Reference to the instantiated mavlink object, for access to target system/component.
var mavlinkParser;

// This really needs to not be here.
// TODO really?
// GH#159
var uavConnection;

// See comments in header for where this comes from.
// TODO refactor into global APM translation object GH#161.
// 0 / 1 means indicates if the item is currently being executed, so when we are _sending_ these items,
// it should always be 0; when we are requesting the item, it may be 0 or 1 depending on if it's being
// currently executed.
// 2 means it's a "guided mode" waypoint, to be executed immediately, and
// 3 means it's a "change altitude only" waypoint for "guided mode."
var APM = {
    mission_current: {
        inactive: 0,
        active: 1,
        guided: 2,
        altitude: 3
    }
};

// Waypoints, an ordered array of waypoint MAVLink objects
var missionItems = [];

// Handler when the ArduPilot requests individual waypoints: upon receiving a request,
// Send the next one.
function missionRequestHandler(missionItemRequest) {
    log.verbose('Sending mission sequence number ' + missionItemRequest.seq);
    log.debug('Sending mission item packet', missionItems[missionItemRequest.seq]);

    // If the requested mission item isn't present, bail
    if( _.isUndefined(missionItems[missionItemRequest.seq])) {
        log.error('APM asked to send undefined mission packet [#%d]', missionItemRequest.seq, missionItems);
        throw new Error('APM asked to send undefined mission packet');
    }

    mavlinkParser.send(missionItems[missionItemRequest.seq], uavConnection);
}

// Mission object constructor
var MavMission = function(mavlinkProtocol, mavlinkProtocolInstance, uavConnectionObject, logger) {

    log = logger;
    mavlink = mavlinkProtocol;
    mavlinkParser = mavlinkProtocolInstance;
    uavConnection = uavConnectionObject;

};

util.inherits(MavMission, events.EventEmitter);

// http://qgroundcontrol.org/mavlink/waypoint_protocol
MavMission.prototype.sendToPlatform = function() {
    log.silly('Sending mission to platform...');

    // send mission_count
    // TODO see GH#95
    var missionCount = new mavlink.messages.mission_count(mavlinkParser.srcSystem, mavlinkParser.srcComponent, missionItems.length);
    mavlinkParser.send(missionCount, uavConnection);

    // attach mission_request handler, let it cook
    mavlinkParser.on('MISSION_REQUEST', missionRequestHandler);

    var self = this;

    // If the ack is OK, signal OK; if not, signal an error event
    // http://qgroundcontrol.org/mavlink/waypoint_protocol
    mavlinkParser.on('MISSION_ACK', function ackMission(ack) {
        if (mavlink.MAV_MISSION_ACCEPTED === ack.type) {

            // log.debug the mission_items in QGC format
            self.writeToQgcFormat();

            mavlinkParser.removeListener('MISSION_ACK', ackMission);
            self.emit('mission:loaded');
        } else {
            log.error('Unexpected MISSION_ACK type received: %d', ack.type);
            throw new Error('Unexpected mission acknowledgement received in mavMission.js');
        }
    });
};

// Read the current mission from the UAV, into this instance of MavMission.
MavMission.prototype.fetchFromPlatform = function() {
    var deferred = Q.defer();

    // Count of waypoints to be fetched
    var count = 0;

    // Index of which waypoint we're requesting
    var index = 0;

    missionItems = []; // clear current mission items

    // Request mission item #n
    var sendMissionRequest = function(n) {
        var missionRequest = new mavlink.messages.mission_request(mavlinkParser.srcSystem, mavlinkParser.srcComponent, n);
        mavlinkParser.send(missionRequest);
    };

    mavlinkParser.once('MISSION_COUNT', function fetchWaypoints(msg) {
        log.debug('Got waypoint count %d', msg.count);
        count = msg.count;
        sendMissionRequest(0);
    });

    mavlinkParser.on('MISSION_ITEM', function handleMissionItem(msg) {
        log.debug('Got mission item at index = %d', index);

        if(index !== msg.seq) {
            log.error('Mismatch between mission item requested and received.');
        }

        index++;
        missionItems[msg.seq] = msg;
        if(index < count) {
            // Send next request
            sendMissionRequest(index);
        } else {
            // Done, send final ack
            var missionAck = new mavlink.messages.mission_ack(mavlinkParser.srcSystem, mavlinkParser.srcComponent, mavlink.MAV_MISSION_ACCEPTED);
            mavlinkParser.send(missionAck);
            mavlinkParser.removeListener('MISSION_ITEM', handleMissionItem);
            log.info('Downloaded mission items from platform.');
            deferred.resolve(this);
        }
    });

    // This starts the process off.
    var waypointRequestList = new mavlink.messages.mission_request_list(mavlinkParser.srcSystem, mavlinkParser.srcComponent);
    mavlinkParser.send(waypointRequestList);
    log.verbose('Requesting mission from UAV...');

    return deferred.promise;
};

// MissionItemMessage is a MAVLink MessageItem object
MavMission.prototype.addMissionItem = function(missionItemMessage) {
    if (_.isUndefined(missionItemMessage)) {
        throw new Error('Undefined message item in MavMission.addMissionItem!');
    }
    missionItems[missionItemMessage.seq] = missionItemMessage;
};

MavMission.prototype.clearMission = function() {
    log.info('Clearing all mission items...');

    var deferred = Q.defer();
    mavlinkParser.once('MISSION_ACK', function verifyClearMission(msg) {
        if(msg.type == mavlink.MAV_MISSION_ACCEPTED) {
            log.verbose('Mission items confirmed cleared by APM.');
            deferred.resolve();
        } else {
            log.warn('Request to clear mission items failed. ', util.inspect(msg));
            deferred.reject(msg);
        }
    });

    missionItems = [];
    var missionClearAll = new mavlink.messages.mission_clear_all(mavlinkParser.srcSystem, mavlinkParser.srcComponent);
    mavlinkParser.send(missionClearAll);

    return deferred.promise;
};

// Expects an array of mission_item mavlink messages.
MavMission.prototype.loadMission = function(mission) {
    var deferred = Q.defer();

    // deal with this properly, add promises etc.
    // TODO GH#159
    this.clearMission()
        .then(_.bind(function() {

            _.each(mission, function(missionItem) {
                this.addMissionItem(missionItem);
            }, this);

            this.sendToPlatform();

        }, this))
        .done(); // rethrow errors

    this.on('mission:loaded', function() {
        log.info('Mission loaded successfully!');
        deferred.resolve();
    });

    return deferred.promise;

};

MavMission.prototype.getMissionItems = function() {
    return missionItems;
};

// Given lat/lon, build a two-item mission that takes off and hovers.
// Returns an array of mission items.
MavMission.prototype.buildTakeoffThenHoverMission = function(lat, lon, alt) {
    if(!lat || !lon || !alt) {
        log.error('Lat [%d], lon [%d], alt [%d] zero or undefined in buildTakeoffThenHoverMission', lat, lon, alt);
        throw new Error('Lat, Lon, or Altitude were zero/undefined when asked to build takeoff mission');
    }
    var takeoff = new mavlink.messages.mission_item(
        mavlinkParser.srcSystem,
        mavlinkParser.srcComponent,
        0, // sequence number, see GH#159
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_WAYPOINT, // 0th waypoint at "home"
        APM.mission_current.active, // we're active at the 0th waypoint!  :) beers for me soon
        1, // autocontinue to next waypoint,
        0, // 4 params, unused for this message type
        0,
        0,
        0,
        lat,
        lon,
        0 // relative alt; takeoff point = 0
    );

    var hover = new mavlink.messages.mission_item(
        mavlinkParser.srcSystem,
        mavlinkParser.srcComponent,
        1, // sequence number,
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_TAKEOFF,
        APM.mission_current.inactive,
        0, // end of mission, platform should hover after this.
        0, // 4 params, unused for this message type
        0,
        0,
        0,
        lat,
        lon,
        alt
    );

    return [takeoff, hover];
};

// Dumps current mission plan to console in QGC format, should be able
// to copy/paste and load in APM planner to check the mission out.
MavMission.prototype.writeToQgcFormat = function(filename) {

    filename = filename || './tmp/waypoints' + moment().format('-MM-DD-YYYY-HH-mm-ss') + '.txt';

    try {
        log.verbose('Writing QGC format mission items to %s', filename);

        var qgcMissionItems = [];
        qgcMissionItems.push('QGC WPL 120');

        _.each(missionItems, function(item) {
            var qgcMissionItem = [
                item.seq,    // sequence number
                item.current,    // current
                item.frame,    // coordinate frame
                item.command,
                item.param1,
                item.param2,
                item.param3,
                item.param4,
                item.x,
                item.y,
                item.z,
                item.autocontinue
            ];
            qgcMissionItems.push(qgcMissionItem.join('\t'));
        });

        fs.writeFile(filename, qgcMissionItems.join('\n'), function(err) {
            if(err) log.error('Error writing QGC format waypoints, %s', err);
        });

    } catch(e) {
        log.error(e);
    }
};

module.exports = MavMission;
