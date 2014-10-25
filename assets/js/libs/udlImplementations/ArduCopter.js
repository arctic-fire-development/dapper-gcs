'use strict';
/*global require, util, Buffer, module */

var udlInterface = require('../udlInterface.js'),
    mavlink = require('mavlink_ardupilotmega_v1.0'),
    Q = require('q'),
    Qretry = require('qretry'),
    jspack = require('jspack').jspack,
    dgram = require('dgram'),
    _ = require('underscore');

// Enum of custom modes from ArduPilot/ArduCopter/defines.h, used in flightmode.pde etc.
// Only the modes that we use are defined here; add others as required.
var APM = {
    custom_modes: {
        STABILIZE: 0,
        ALT_HOLD: 2,
        AUTO: 3,
        GUIDED: 4,
        LOITER: 5,
        RTL: 6,
        LAND: 9
    },
    // from MAV_STATE enum
    system_status: {
        STANDBY: 3,
        ACTIVE: 4
    }
};

var log; // populated when object is created, expects Winston log object
var config; // set when object is instantiated, nconf instance

function ArduCopterUdl(logger, configObject) {
    log = logger;
    config = configObject;
}

util.inherits(ArduCopterUdl, udlInterface);

// MAVLink protocol implementation for parsing/sending messages over the wire
var protocol;

ArduCopterUdl.prototype.setProtocol = function(protocolParser) {
    protocol = protocolParser;
};

// If the sitl parameter is true, then this function will try and trigger a communications to the SITL UDP port.
ArduCopterUdl.prototype.takeoff = function() {

    var deferred = Q.defer();

    log.info('ArduCopter UDL: sending takeoff command...');

    if (true === config.get('sitl:active')) {

        log.info('ArduCopter UDL: sending SITL command for takeoff...');

        try {
            var sitlUdp = dgram.createSocket('udp4');
            var buf = new Buffer(jspack.Pack('<HHHHHHHH', [0, 0, 1530, 0, 0, 0, 0, 0])); // 1530 to RC3 launches the quad.
            sitlUdp.send(buf, 0, buf.length, config.get('sitl:port'), config.get('sitl:host'));
        } catch (e) {
            log.error('Uncaught exception when sending SITL RC override UDP packet to simulator', e);
        }
        deferred.resolve();

    } else {

        var throttle = new mavlink.messages.rc_channels_override(
            mavlink.srcSystem,
            mavlink.srcComponent,
            0, 0, // release channels 1, 2 back to RC controller
            1530, // RC3 = throttle, this value should be good enough
            0, 0, 0, 0, 0
        ); // release other channels

        // We need to send this message with a special header
        // so that APM will respect it.
        protocol.connection.sendAsGcs(throttle);

        // When system is shown to be "Active," we're in business.
        protocol.on('HEARTBEAT', function confirmSystemActive(msg) {
            if (msg.system_status == APM.system_status.ACTIVE) {
                log.debug('System confirmed as active, should be taking off...');
                protocol.removeListener('HEARTBEAT', confirmSystemActive);
                deferred.resolve();
            }
        });
    }

    return deferred.promise;

};

ArduCopterUdl.prototype.arm = function() {
    var deferred = Q.defer();
    log.info('ArduCopter UDL: arming ArduCopter...');

    var command_long = new mavlink.messages.command_long(
        // GH#317 remove hardcoded refs to sysIDs
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
        if( msg.result !== 0 ) {
            log.debug('COMMAND_ACK rejected; command [%d] result [%d]', msg.command, msg.result);
            throw new Error('Result of COMMAND_ACK for arming failed');
        }
    });

    // More troubleshooting.  Some messages that come back from the APM
    // as status text, rather than direct failures.  TODO GH#356, see if this is always true / research.
    protocol.on('STATUSTEXT', function handleStatusErrors(msg) {
        if( msg.severity == mavlink.MAV_SEVERITY_ERROR ) {
            log.debug('Arming rejected: %s', msg.text);
            throw new Error('Arming rejected due to status text message error');
        }
    });

    protocol.on('HEARTBEAT', function verifyArmed(msg) {
        log.verbose('heartbeat.base_mode: %d', msg.base_mode);
        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_SAFETY) {
                protocol.removeListener('HEARTBEAT', verifyArmed);
                deferred.resolve();
            } else {
                log.verbose('Waiting on ack for arming, currently mode is %d', msg.base_mode);
                protocol.send(command_long);
            }
        } catch (e) {
            log.error('Uncaught error in ArduCopterUdl.arm()', e);
        }
    });

    return deferred.promise;

};

// TODO GH#139, lots of code dupe here for the moment.
ArduCopterUdl.prototype.disarm = function() {
    var deferred = Q.defer();
    log.info('ArduCopter UDL: disarming ArduCopter...');

    var command_long = new mavlink.messages.command_long(
        // GH#317 remove hardcoded refs to sysIDs
        1, // target system
        mavlink.MAV_COMP_ID_SYSTEM_CONTROL, // target_component
        mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        1, // don't request ack, we'll listen for the mode change directly
        0, // param1 (1 to indicate arm)
        0, 0, 0, 0, 0, 0 // all other parameters meaningless
    );

    // Quite a bit of troubleshooting needs to happen here.
    // The APM returns a command result of '3' when some pre-arm checks continue to fail.
    // So we need to examine the command ack relative to this arming request and be prepared
    // to handle edge cases around it.
    protocol.on('COMMAND_ACK', function verifyDisarmingAck(msg) {
        if( msg.result != 0 ) {
            log.debug('COMMAND_ACK rejected; command [%d] result [%d]', msg.command, msg.result);
            throw new Error('Result of COMMAND_ACK for disarming failed');
        }
    });

    // Fun fact: when the system is instructed to disarm, it'll send back a status message (STATUSTEXT)
    // with MAV_SEVERITY_ERROR stating 'DISARMING MOTORS'.  We don't need to trap that,
    // but ...there it is.
    protocol.on('HEARTBEAT', function verifyDisarmed(msg) {
        log.verbose('heartbeat.base_mode: %d', msg.base_mode);
        try {
            if (0  === (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_SAFETY)) {
                protocol.removeListener('HEARTBEAT', verifyDisarmed);
                deferred.resolve();
            } else {
                log.verbose('Waiting on ack for disarming, currently mode is %d', msg.base_mode);
                protocol.send(command_long);
            }
        } catch (e) {
            log.error('Uncaught error in ArduCopterUdl.disarm()', e);
        }
    });

    return deferred.promise;

};

ArduCopterUdl.prototype.setAutoMode = function() {
    log.info('ArduCopter UDL: setting auto mode...');

    var deferred = Q.defer();

    try {
        protocol.on('HEARTBEAT', function confirmAutoMode(msg) {
            if (msg.custom_mode == APM.custom_modes.AUTO) {
                log.debug('Custom mode AUTO confirmed set OK.');
                protocol.removeListener('HEARTBEAT', confirmAutoMode);
                deferred.resolve();
            }
        });
    } catch (e) {
        log.error(e);
    }

    var set_mode = new mavlink.messages.set_mode(
        // GH#317 remove hardcoded refs to sysIDs
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        APM.custom_modes.AUTO // magic number for guided mode!  APM-specific.
    );
    protocol.send(set_mode);

    return deferred.promise;

};


ArduCopterUdl.prototype.setLoiterMode = function() {
    log.info('ArduCopter UDL: setting Loiter mode...');
    var deferred = Q.defer();

    var set_mode = new mavlink.messages.set_mode(
        // GH#317 remove hardcoded refs to sysIDs
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        APM.custom_modes.LOITER // magic number for copter Loiter mode!  APM-specific.
    );

    // Attach listener to confirm that mode has been set to guided.
    protocol.on('HEARTBEAT', function confirmLoiterMode(msg) {

        try {
            if (msg.custom_mode == APM.custom_modes.LOITER) {
                log.info('ArduCopter UDL: mode confirmed set to Loiter mode!');
                deferred.resolve();
                protocol.removeListener('HEARTBEAT', confirmLoiterMode);
            } else {
                log.debug('waiting for loiter, sent mode change request, currently custom_mode: %d', msg.custom_mode);
            }

        } catch (e) {
            log.error('Uncaught exception in ArduCopterUdl.setLoiterMode', e);
        }
    });

    protocol.send(set_mode);
    return deferred;
};


ArduCopterUdl.prototype.setGuidedMode = function() {

    log.info('ArduCopter UDL: setting Guided mode...');

    var deferred = Q.defer();
    var guidedModeSetter = function() {
        log.verbose('Attempting to set Guided mode in guidedModeSetter (qretry version)');
        // Create message to request mode be set to Loiter
        var set_mode = new mavlink.messages.set_mode(
            1, // target system,
            mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
            APM.custom_modes.GUIDED
        );
        protocol.send(set_mode);
        return deferred.promise;

    }

    // Attach listener to confirm that mode has been set to guided.
    protocol.on('HEARTBEAT', function confirmGuidedMode(msg) {

        try {
            if (msg.base_mode & mavlink.MAV_MODE_FLAG_DECODE_POSITION_GUIDED) {
                log.info('ArduCopter UDL: mode confirmed set to Guided mode!');
                protocol.removeListener('HEARTBEAT', confirmGuidedMode);
                deferred.resolve();
            } else {
                log.debug('Switching to Loiter, command sent, current base mode: %d', msg.base_mode);
            }
        } catch (e) {
            log.error('Uncaught exception in ArduCopterUdl.setGuidedMode', e);
        }
    });

    return new Qretry(guidedModeSetter,
        {
            maxRetry: 10,
            interval: 100,
            intervalMultiplicator: 1.1
        }
    );
};

ArduCopterUdl.prototype.rtl = function() {

    log.info('ArduCopter UDL: setting RTL mode...');

    var deferred = Q.defer();

    // Create message to request mode be set to Loiter
    var set_mode = new mavlink.messages.set_mode(
        // GH#317 remove hardcoded refs to sysIDs
        1, // target system,
        mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, // instruct to enable a custom mode
        APM.custom_modes.RTL
    );

    // Attach listener to confirm that mode has been set to guided.
    protocol.on('HEARTBEAT', function confirmRtlMode(msg) {

        try {
            if (msg.custom_mode == APM.custom_modes.RTL) {
                log.info('ArduCopter UDL: mode confirmed set to RTL mode!');
                protocol.removeListener('HEARTBEAT', confirmRtlMode);
                deferred.resolve();
            } else {
                log.debug('Switching to RTL, command sent, current custom mode: %d', msg.custom_mode);
            }
        } catch (e) {
            log.error('Uncaught exception in ArduCopterUdl.setRTLMode', e);
        }
    });

    protocol.send(set_mode);
    return deferred.promise;

};

ArduCopterUdl.prototype.changeAltitude = function(alt, platform) {
    log.info('ArduCopter UDL: changing altitude to %d...', alt);

    var guided_mission_item = new mavlink.messages.mission_item(
        // GH#317 remove hardcoded refs to sysIDs
        1, 1, // system ids
        0, // ?
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        // TODO See GH#94, improving this message here.
        2, 0, 0, 0, 0, 0, // 3 is the magic number meaning change altitude; should we use that??
        platform.lat, platform.lon, alt
    );

    if(platform.custom_mode != APM.custom_modes.GUIDED) {
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

ArduCopterUdl.prototype.guidedLoiter = function() {
    log.info('ArduCopter UDL: sending guided-loiter command...');
    var deferred = Q.defer();

    var guided_loiter_unlimited = new mavlink.messages.command_long(
        // GH#317 remove hardcoded refs to sysIDs
        1, // target system
        mavlink.MAV_COMP_ID_SYSTEM_CONTROL, // target_component
        mavlink.MAV_CMD_NAV_LOITER_UNLIM,
        1, // confirmation, yes please!
        0, 0, 0, 0, 0, 0, 0
    );

    var confirmedGuidedLoiter = function(command_ack) {
        if(mavlink.MAV_MISSION_ACCEPTED === command_ack.type) {
            deferred.resolve();
        } else {
            log.warn('Command for Guided-Loiter was rejected [%d]', command_ack.type);
        }
        deferred.reject();
    }

    protocol.once('MISSION_ACK', confirmedGuidedLoiter);
    protocol.send(guided_loiter_unlimited);
    return deferred.promise;

};

ArduCopterUdl.prototype.flyToPoint = function(lat, lon, platform) {
    log.info('ArduCopter UDL: flying to point...');
    var deferred = Q.defer();
    var guided_mission_item = new mavlink.messages.mission_item(
        // GH#317 remove hardcoded refs to sysIDs
        1, 1, // system ids
        0, // seq#
        mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        2, 0, 0, 0, 0, 0, // 2 = guided nav waypoint.
        lat, lon, platform.relative_alt // use current altitude
    );

    log.verbose('Flying to %d %d %d', lat, lon, platform.relative_alt);

    if(platform.custom_mode != APM.custom_modes.GUIDED) {
        // Need to set guided mode first.
        log.verbose('Switching to Guided more before transmitting fly-to-point nav mission item');
        try {
            Q.fcall(this.setGuidedMode)
                .then(function() {
                    deferred.resolve();
                    log.verbose('Switched to GUIDED, now transmitting mission item.');
                    protocol.send(guided_mission_item);
                });
        } catch(e) {
            log.error('Uncaught exception in ArduCopterUdl.flyToPoint', e);
            log.error(util.inspect(e.stack))
        }
    } else {
        deferred.resolve();
        protocol.send(guided_mission_item);
    }
    return deferred.promise;
};

ArduCopterUdl.prototype.getLatLon = function() {
    var deferred = Q.defer();
    protocol.once('GLOBAL_POSITION_INT', function getLatLon(msg) {
        deferred.resolve([
            msg.lat / 1e7, msg.lon / 1e7
        ]);
    });
    return deferred.promise;
};

module.exports = ArduCopterUdl;
module.exports.APM = APM;