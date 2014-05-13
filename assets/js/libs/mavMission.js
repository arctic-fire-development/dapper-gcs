/*
Waypoint state manager.
*/
var _ = require('underscore'),
    Q = require('q');

// Logging object (winston)
var log;

// Reference to the mavlink protocol object
var mavlink;

// Reference to the instantiated mavlink object, for access to target system/component.
var mavlinkParser;

// This really needs to not be here.
// TODO really?
var uavConnection;

// Handler when the ArduPilot requests individual waypoints: upon receiving a request,
// Send the next one.
function missionRequestHandler(missionItemRequest) {
    log.verbose('Sending mission sequence number ' + missionItemRequest.seq);
    log.debug('Sending mission item packet', missionItems[missionItemRequest.seq]);

    // If the requested mission item isn't present, bail
    if( _.isUndefined(missionItems[missionItemRequest.seq])) {
        log.error('APM asked to send undefined mission packet [#%d]', missionItemRequest.seq, missionItems);
        throw new Error("APM asked to send undefined mission packet");
    }

    mavlinkParser.send(missionItems[missionItemRequest.seq], uavConnection);
}

// Mapping from numbers (as those stored in waypoint files) to MAVLink commands.
var commandMap;

// Waypoints, an ordered array of waypoint MAVLink objects
var missionItems = [];

// Mission object constructor
MavMission = function(mavlinkProtocol, mavlinkProtocolInstance, uavConnectionObject, logger) {

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
    var missionCount = new mavlink.messages.mission_count(mavlinkParser.srcSystem, mavlinkParser.srcComponent, missionItems.length);
    mavlinkParser.send(missionCount, uavConnection);

    // attach mission_request handler, let it cook
    mavlinkParser.on('MISSION_REQUEST', missionRequestHandler);

    var self = this;

    // If the ack is OK, signal OK; if not, signal an error event
    // http://qgroundcontrol.org/mavlink/waypoint_protocol
    mavlinkParser.on('MISSION_ACK', function ackMission(ack) {
        if (mavlink.MAV_MISSION_ACCEPTED === ack.type) {
            mavlinkParser.removeListener('MISSION_ACK', ackMission);
            self.emit('mission:loaded');
        } else {
            log.error('Unexpected MISSION_ACK type received: %d', ack.type);
            throw new Error('Unexpected mission acknowledgement received in mavMission.js');
        }
    });
};

// MissionItemMessage is a MAVLink MessageItem object
MavMission.prototype.addMissionItem = function(missionItemMessage) {
    if (_.isUndefined(missionItemMessage)) {
        throw new Error('Undefined message item in MavMission.addMissionItem!');
    }
    missionItems[missionItemMessage.seq] = missionItemMessage;
};

MavMission.prototype.clearMission = function(first_argument) {
    log.info('Clearing all mission items...');
    missionItems = [];
    var missionClearAll = new mavlink.messages.mission_clear_all(mavlinkParser.srcSystem, mavlinkParser.srcComponent);
    mavlinkParser.send(missionClearAll);
};

MavMission.prototype.loadMission = function() {
    var deferred = Q.defer();

    this.on('mission:loaded', function() {
        log.info('Mission loaded successfully!');
        deferred.resolve();
    });

    loadMission(this, deferred);

    return deferred.promise;
};

MavMission.prototype.getMissionItems = function() {
    return missionItems;
};

// Stub for initial development/testing
loadMission = function(mission) {

    mission.clearMission();

    _.each(takeoffAndThenLand, function(e, i, l) {
        // target_system, target_component, seq, frame, command, current, autocontinue, param1, param2, param3, param4, x, y, z
        mi = new mavlink.messages.mission_item(
            mavlinkParser.srcSystem,
            mavlinkParser.srcComponent,
            e[0], // seq
            e[2], // frame
            e[3], // command
            e[1], // current
            e[11], // autocontinue
            e[4], // param1,
            e[5], // param2,
            e[6], // param3
            e[7], // param4
            e[8], // x (latitude
            e[9], // y (longitude
            e[10] // z (altitude
        );
        mission.addMissionItem(mi);
    });

    mission.sendToPlatform();

};

// This mission simply takes off and hovers at 20 meters.
var takeoffAndThenLand = [
    //QGC,WPL,110
    // ref frame 3 = Global coordinate frame, WGS84 coordinate system, relative altitude

    //s,fr,ac,cmd,p1,p2,p3,p4,lat,lon,alt,continue
    // the 0th waypoint.  what's this good for?
    [0, 1, 3, 16, 0.000000, 0.000000, 0.000000, 0.000000, -35.362881, 149.165222, 0, 1],

    //,takeoff, do not continue to next waypoint
    [1, 0, 3, 22, 0.000000, 0.000000, 0.000000, 0.000000, -35.362881, 149.165222, 20, 0]

];


module.exports = MavMission;