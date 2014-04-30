var udlInterface = require('../udlInterface.js'),
    mavlink = require('mavlink_ardupilotmega_v1.0'),
    Q = require('q'),
    jspack = require('jspack').jspack,
    dgram = require('dgram');

var log; // populated when object is created, expects Winston log object
var config; // set when object is instantiated, nconf instance

function planeUdl(logger, configObject) {
    log = logger;
    config = configObject;
};

util.inherits(planeUdl, udlInterface);

// MAVLink protocol implementation for parsing/sending messages over the wire
var protocol;

planeUdl.prototype.setProtocol = function(protocolParser) {
    protocol = protocolParser;
};

// If the sitl parameter is true, then this function will try and trigger a communications to the SITL UDP port.
planeUdl.prototype.takeoff = function() {

    var deferred = Q.defer();

    return this.arm()
        .then(this.setAutoMode)
        .then(function() {
            return deferred.resolve();
        });

    return deferred.promise;

};

planeUdl.prototype.arm = function() {
    var deferred = Q.defer();
    log.info('plane UDL: arming plane...');

    protocol.on('HEARTBEAT', function callback(msg) {
        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_SAFETY) {
                protocol.removeListener('HEARTBEAT', callback);
                deferred.resolve();
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

planeUdl.prototype.setAutoMode = function() {
    log.info('plane UDL: setting auto mode...');

    var deferred = Q.defer();

    try {
        protocol.on('COMMAND_ACK', function confirmAutoCommandAck(msg) {
            if (true) {
                protocol.removeListener('HEARTBEAT', confirmAutoCommandAck);
                deferred.resolve();
            }
        });

    } catch (e) {
        console.log(e);
    }

    var command_long = new mavlink.messages.command_long(1, 1, mavlink.MAV_CMD_MISSION_START, 0, 0, 0, 0, 0, 0, 0, 0);
    protocol.send(command_long);
    return deferred.promise;

};

module.exports = planeUdl;