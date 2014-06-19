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

    return this.arm() //.then(this.setAutoMode)
        .then(function() {

            log.info('Quadcopter UDL: sending takeoff command...');

            if (true === config.get('sitl:active')) {
                log.info('Quadcopter UDL: sending SITL command for takeoff...');

                setTimeout(function() {
                    
                    log.info('sending rc ovveriderrr');
                    var rc_override = new mavlink.messages.rc_channels_override(253, 1, 0, 0, 1500, 0, 0, 0, 0, 0);
                    protocol.send(rc_override);

                }, 4000);

                try {
                    var sitlUdp = dgram.createSocket('udp4');
                    var buf = new Buffer(jspack.Pack('<HHHHHHHH', [0, 0, 1530, 0, 0, 0, 0, 0])); // 1530 to RC3 launches the quad.
                    sitlUdp.send(buf, 0, buf.length, config.get('sitl:port'), config.get('sitl:host'), function(err, bytes) {
                        log.error(err);
                        log.error('something is wrong in sitlUdp');
                        throw (err);
                    });
                } catch (e) {
                    log.error('something is wrong');
                    console.log(e);
                    log.error(e);
                }
/*
            // let's try both...?  } else {

                // This code is currently nonfunctional.  What we want to do is to trigger the
                // "takeoff" by forcing an RC control override to RC3.
                var rc_override = new mavlink.messages.rc_channels_override(1, 1, 0, 0, 1500, 0, 0, 0, 0, 0);
                var rc_override_send = _.partial(_.bind(protocol.send, protocol), rc_override);
                setInterval(rc_override_send, 50);
*/
            }


            return deferred.resolve();
        });

    return deferred.promise;

};

quadcopterUdl.prototype.arm = function() {
    var deferred = Q.defer();
    log.info('Quadcopter UDL: arming quadcopter...');

    protocol.on('HEARTBEAT', function callback(msg) {

        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_SAFETY) {
                protocol.removeListener('HEARTBEAT', callback);
                deferred.resolve();
            } else {
                console.log(msg.base_mode);
            }
        } catch (e) {
            console.log(e);
        }
    });

    var command_long = new mavlink.messages.command_long(
        1, // target system
        mavlink.MAV_COMP_ID_SYSTEM_CONTROL, // target_component
        mavlink.MAV_CMD_COMPONENT_ARM_DISARM, // command
        0, // confirmation
        1, // param1 (1 to indicate arm)
        0, // param2 (all other params meaningless)
        0, // param3
        0, // param4
        0, // param5
        0, // param6
        0); // param7
    protocol.send(command_long);

    return deferred.promise;

};

quadcopterUdl.prototype.setAutoMode = function() {
    log.info('Quadcopter UDL: setting auto mode...');

    var deferred = Q.defer();

    try {
        protocol.on('COMMAND_ACK', function confirmAutoCommandAck(msg) {
            // TODO: this isn't right:
            if (true) {
                protocol.removeListener('HEARTBEAT', confirmAutoCommandAck);
                deferred.resolve();
            }
        });

    } catch (e) {
        log.error(e);
    }

    var command_long = new mavlink.messages.command_long(1, 1, mavlink.MAV_CMD_MISSION_START, 0, 0, 0, 0, 0, 0, 0, 0);
    protocol.send(command_long);
    return deferred.promise;

};


quadcopterUdl.prototype.setLoiterMode = function() {
    log.info('Quadcopter UDL: setting Loiter mode...');
    var deferred = Q.defer();

};


quadcopterUdl.prototype.setGuidedMode = function() {
    log.info('Quadcopter UDL: setting Guided mode...');

    protocol.on('RC_CHANNELS_RAW', function(msg) {
        log.info('chan3raw = %d' ,msg.chan3_raw);
    });

    var deferred = Q.defer();

    // Attach listener to confirm that mode has been set to guided.
    protocol.on('HEARTBEAT', function checkGuidedMode(msg) {
        
        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_GUIDED) {
                deferred.resolve();
                log.info('Quadcopter UDL: mode confirmed set to Guided mode!');
                protocol.removeListener('HEARTBEAT', checkGuidedMode);
            } else {
                log.info('base mode: %d', msg.base_mode);
            }
        } catch (e) {
            log.error(e);
        }
    });

    var set_mode = new mavlink.messages.set_mode(
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        4 // magic number for guided mode!
    );
    protocol.send(set_mode);

    return deferred.promise;

};

quadcopterUdl.prototype.flyToPoint = function(lat, lon, alt) {
    log.info('Quadcopter UDL: flying to point...');
    var deferred = Q.defer();
                                        
    var guided_mission_item = new mavlink.messages.mission_item(
        1, 1, // system ids
        0, // ?
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        2, 0, 0, 0, 0, 0, // ? is 2 the magic number here?
        lat, lon, alt
    );
    protocol.send(guided_mission_item);

};

module.exports = quadcopterUdl;