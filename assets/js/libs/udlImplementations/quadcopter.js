var udlInterface = require('../udlInterface.js'),
    mavlink = require('mavlink_ardupilotmega_v1.0'),
    Q = require('q'),
    jspack = require('jspack').jspack,
    dgram = require('dgram');

var log; // populated when object is created, expects Winston log object
var config; // set when object is instantiated, nconf instance

function quadcopterUdl(logger, configObject) {
    log = logger;
    config = configObject;
};

util.inherits(quadcopterUdl, udlInterface);

// MAVLink protocol implementation for parsing/sending messages over the wire
var protocol;

quadcopterUdl.prototype.setProtocol = function(protocolParser) {
    protocol = protocolParser;
};

// If the sitl parameter is true, then this function will try and trigger a communications to the SITL UDP port.
quadcopterUdl.prototype.takeoff = function() {

    var deferred = Q.defer();

    log.info('Quadcopter UDL: sending takeoff command...');

    if (true === config.get('sitl:active')) {
        log.info('Quadcopter UDL: sending SITL command for takeoff...');

        // setTimeout(function() {
        //     var rc_override = new mavlink.messages.rc_channels_override(253, 1, 0, 0, 1500, 0, 0, 0, 0, 0);
        //     protocol.send(rc_override);
        // }, 4000);

        try {
            var sitlUdp = dgram.createSocket('udp4');
            var buf = new Buffer(jspack.Pack('<HHHHHHHH', [0, 0, 1530, 0, 0, 0, 0, 0])); // 1530 to RC3 launches the quad.
            sitlUdp.send(buf, 0, buf.length, config.get('sitl:port'), config.get('sitl:host'), function(err, bytes) {
                log.error('Error occurred when sending SITL RC override udp to simulator', err);
            });
        } catch (e) {
            log.error('Uncaught exception when sending SITL RC override UDP packet to simulator', e);
        }
        deferred.resolve();

        // This code is currently nonfunctional.  What we want to do is to trigger the
        // "takeoff" by forcing an RC control override to RC3.
        // var rc_override = new mavlink.messages.rc_channels_override(1, 1, 0, 0, 1500, 0, 0, 0, 0, 0);
        // var rc_override_send = _.partial(_.bind(protocol.send, protocol), rc_override);
        // setInterval(rc_override_send, 50);

    }

    return deferred.promise;

};

quadcopterUdl.prototype.arm = function() {
    var deferred = Q.defer();
    log.info('Quadcopter UDL: arming quadcopter...');

    var command_long = new mavlink.messages.command_long(
        1, // target system
        mavlink.MAV_COMP_ID_SYSTEM_CONTROL, // target_component
        mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        1, // don't request ack, we'll listen for the mode change directly
        1, // param1 (1 to indicate arm)
        0, 0, 0, 0, 0, 0 // all other parameters meaningless
    );

    // Quite a bit of troubleshooting needs to happen here.
    // The APM returns a command result of '3' when some pre-arm checks continue to fail.
    // So we need to examine the command ack relative to this arming request and be prepared
    // to handle edge cases around it.
    protocol.on('COMMAND_ACK', function verifyArmingAck(msg) {
        console.log(msg);
        if( msg.result != 0 ) {
            throw new Error('Result of COMMAND_ACK for arming failed');
        }
    });

    protocol.on('HEARTBEAT', function verifyArmed(msg) {
        log.verbose('heartbeat.base_mode: %d', msg.base_mode)
        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_SAFETY) {
                protocol.removeListener('HEARTBEAT', verifyArmed);
                deferred.resolve();
            } else {
                log.verbose('Waiting on ack for arming, currently mode is %d', msg.base_mode);
                protocol.send(command_long);
            }
        } catch (e) {
            log.error('Uncaught error in QuadcopterUdl.arm()', e);
        }
    });

    return deferred.promise;

};

quadcopterUdl.prototype.setAutoMode = function() {
    log.info('Quadcopter UDL: setting auto mode...');

    var deferred = Q.defer();

    try {
        protocol.on('HEARTBEAT', function confirmAutoMode(msg) {
            console.log(msg.custom_mode);
            if (msg.custom_mode = 3) {
                protocol.removeListener('HEARTBEAT', confirmAutoMode);
                deferred.resolve();
            }
        });

    } catch (e) {
        log.error(e);
    }

    var set_mode = new mavlink.messages.set_mode(
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        3 // magic number for guided mode!  APM-specific.
    );
    protocol.send(set_mode);


    return deferred.promise;

};


quadcopterUdl.prototype.setLoiterMode = function() {
    log.info('Quadcopter UDL: setting Loiter mode...');
    var deferred = Q.defer();

};


quadcopterUdl.prototype.setGuidedMode = function() {
    log.info('Quadcopter UDL: setting Guided mode...');

    var deferred = Q.defer();

    // Attach listener to confirm that mode has been set to guided.
    protocol.on('HEARTBEAT', function confirmGuidedMode(msg) {
        
        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_GUIDED) {
                deferred.resolve();
                log.info('Quadcopter UDL: mode confirmed set to Guided mode!');
                protocol.removeListener('HEARTBEAT', confirmGuidedMode);
            } else {
                log.debug('base mode: %d', msg.base_mode);
            }
        } catch (e) {
            log.error('Uncaught exception in QuadcopterUdl.setGuidedMode', e);
        }
    });

    var set_mode = new mavlink.messages.set_mode(
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        4 // magic number for guided mode!  APM-specific.
    );
    protocol.send(set_mode);

    return deferred.promise;

};

quadcopterUdl.prototype.flyToPoint = function(lat, lon, alt, platform) {
    log.info('Quadcopter UDL: flying to point...');
    
    var guided_mission_item = new mavlink.messages.mission_item(
        1, 1, // system ids
        0, // ?
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        2, 0, 0, 0, 0, 0, // ? is 2 the magic number here?
        lat, lon, alt
    );

    if(platform.custom_mode != 4) {
        // Need to set guided mode first.
        log.verbose('Switching to Guided more before transmitting fly-to-point nav mission item');
        Q.fcall(this.setGuidedMode)
            .then(function(){
                protocol.send(guided_mission_item);       
            });
    } else {
        protocol.send(guided_mission_item);    
    }

};

module.exports = quadcopterUdl;