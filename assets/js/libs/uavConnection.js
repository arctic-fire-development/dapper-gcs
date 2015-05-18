'use strict';
/*global require, events, Buffer, exports */

/*
This module is responsible for managing the overall status and health of the UAV connection.
This has two different layers of purpose:
- detect and manage the socket
- handle MAVLink connection
*/

var SerialPort = require('serialport').SerialPort,
    util = require('util'),
    dgram = require('dgram'),
    net = require('net'),
    _ = require('underscore'),
    fs = require('fs'),
    os = require('os'),
    glob = require('glob'),
    moment = require('moment'),
    MAVLink = require('mavlink_ardupilotmega_v1.0'),
    MavParams = require('./mavParam');

// log is expected to be a winston instance; keep it in the shared global namespace for convenience.
var log;

// receivedBinaryLog is the writable stream where all incoming buffer data from the UAV will be written.
var receivedBinaryLog;

// Holds the most recent binary log
var latestBinaryLog;

// sentBinaryLog is the writable stream associated with this connection, all buffer data sent to this UAV will be written to this file.
var sentBinaryLog;

// config is an nconf instance
var config;

// If true, then a connection has been initiated -- keep trying to manage/start this connection.
var started = false;

// True if we're receiving heartbeat packets from the wire protocol
var isConnected = false;

// connection represents the socket-level connection through which MAVLink arrives
var connection = undefined;

// SYSID of the attached UAV -- probably 1, but is set when the connection is established.
// Will be aligned/set along with protocol.srcSystem (MAVlink implementation).
var uavSysId = undefined;

// Component target for protocol messages.  For MAVLink, this is almost always going to be
// equal to 1 unless we're specifically targeting other devices onboard.  OK to set to 1 for now.
// Will be aligned with protocol.srcComponent (MAVLink implementation).
var uavComponentId = 1;

// SYSID of what the UAV expects the messages from the GCS to be.  Probably 255, but
// set when connection is established.
var gcsSysId = undefined;

// name of the message the connection uses to signal that new data is ready to consume
var dataEventName = undefined;

// protocol is the parser for the incoming binary stream (MAVLink)
var protocol;

// this flag is set to true if the event listener must be reattached to the connection, in case
// the connection itself was lost
var attachDataEventListener = true;

// If true, the connection has already been attached.
// TODO hack figure out why this is needed / being done twice
var isAttached = false;

// handler for the Heartbeat setInterval() invocation
var heartbeatMonitor = false;

// Time of the last heartbeat packet was received (timestamp)
var lastHeartbeat = undefined;

// Time elapsed since last heartbeat
var timeSinceLastHeartbeat = undefined;

// Reference to timer function to send heartbeats to GCS.
// Hang onto the reference so we can clear it if we need to.
var sendHeartbeatInterval;

// If true, then this connection has previously been established.
// Used to convey if the connection has been temporarily lost.
var hasConnected = false;

// Set to true if the connection is in a lost state.
var lostConnection = false;

// Used to keep track of the last error emitted to the logs, to avoid spamming
// the logs with a huge sequence of the same error (since some of the possible errors
// occur during heartbeat-type events)
var lastError;

// Incoming config is an nconf instance, already read in the server code.
// Protocol Parser is a mavlink instance
// log is a Winston logger, already configured + ready to use
function UavConnection(configObject, protocolParser, logObject) {

    _.bindAll(this, 'closeConnection', 'handleDataEvent', 'changeState', 'heartbeat', 'invokeState', 'start', 'getState', 'updateHeartbeat', 'disconnected', 'connecting', 'connected', 'sendAsGcs');

    log = logObject;
    config = configObject;
    protocol = protocolParser;

    // name of current state of object, keep this an instance
    // variable because it may well be thought of as 'public'
    this.state = 'disconnected';

    // There are other places to consider instantiating these -- upon connection, or other criteria -- but
    // this is an OK spot for the moment.
    this.startLogging();
}

util.inherits(UavConnection, events.EventEmitter);

UavConnection.prototype.hasStarted = function() {
    log.silly('Status of UavConnection.hasStarted: %s', started);
    return started;
};

// Establish the binary receive/send logs.
UavConnection.prototype.startLogging = function() {

    var logTime = moment().format('-MM-DD-YYYY-HH-mm-ss');
    receivedBinaryLog = fs.createWriteStream(config.get('logging:root') + config.get('logging:receivedBinary') + logTime);
    receivedBinaryLog.on('error', function(err) {
        log.error('unable to log received binary mavlink stream: ' + err);
    });
    latestBinaryLog = fs.createWriteStream(config.get('logging:root') + 'latest');
    sentBinaryLog = fs.createWriteStream(config.get('logging:root') + config.get('logging:sentBinary') + logTime);
    sentBinaryLog.on('error', function(err) {
        log.error('unable to log sent binary mavlink stream: ' + err);
    });

};

// Explicitly close the streams to ensure all data is flushed to disk.
UavConnection.prototype.stopLogging = function() {
    receivedBinaryLog.end();
    latestBinaryLog.end();
    sentBinaryLog.end();
};

UavConnection.prototype.changeState = function(newState) {
    this.state = newState;
    this.emit(this.state);
    log.verbose('[UavConnection] Changing state to [' + this.state + ']');
    this.invokeState(this.state);
};

// The heartbeat function is invoked per configuration (connection:updateIntervals:heartbeatMs)
// and is kicked off when the system enters the 'connected' state.
// The point is to update some timing information and re-invoke whatever current state
// the system is in to see if we need to change state/status.
UavConnection.prototype.heartbeat = function() {

    timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    this.emit(this.state);
    this.emit('heartbeat');
    this.invokeState(this.state);
    log.heartbeat('time since last heartbeat: %d', timeSinceLastHeartbeat);
};

UavConnection.prototype.getTimeSinceLastHeartbeat = function() {
    return timeSinceLastHeartbeat;
}

// Convenience function to make the meaning of the awkward syntax more clear.
UavConnection.prototype.invokeState = function() {
    this[this.state]();
};

UavConnection.prototype.start = function() {

    if (true === started) {
        log.warn('Asked to start connection manager, but connection already started, refused.');
        return;
    }

    log.info('Starting connection manager...');
    started = true;

    this.changeState('disconnected');
};

// Accessor for private variable (stateName)
UavConnection.prototype.getState = function() {
    return this.state;
};

// Update the remote heartbeat's last timestamp
UavConnection.prototype.updateHeartbeat = function() {

    try {
        log.heartbeat('Heartbeat updated: ' + Date.now());
        lastHeartbeat = Date.now();

        // When we get a heartbeat, switch back to connected state.
        if (false === isConnected) {
            isConnected = true;
            timeSinceLastHeartbeat = 0; // fake this so we don't flicker between connected/connecting
            this.changeState('connected');
        }
    } catch (e) {
        log.error('error when updating heartbeat in UavConnectionManager.updateHeartbeat(): ' + util.inspect(e));
    }
};

// The actual heartbeat to be sent to the GCS will depend on the protocol, so we either need a protocol shim or something
// to be really flexible, but that's not important yet.
// TODO GH#124.
// This is invoked once-per-configurable amount (default, 1hz), and is attached when the connection reaches
// "connected" state.
UavConnection.prototype.sendHeartbeat = function() {
    var heartbeatMessage;
    if (!heartbeatMessage) {
        heartbeatMessage = new mavlink.messages.heartbeat(
            mavlink.MAV_TYPE_GCS, // type                      : Type of the MAV (quadrotor, helicopter, etc., up to 15 types, defined in MAV_TYPE ENUM) (uint8_t)
            mavlink.MAV_AUTOPILOT_INVALID, // autopilot                 : Autopilot type / class. defined in MAV_AUTOPILOT ENUM (uint8_t)
            0, // base_mode                 : System mode bitfield, see MAV_MODE_FLAGS ENUM in mavlink/include/mavlink_types.h (uint8_t)
            0, // custom_mode               : A bitfield for use for autopilot-specific flags. (uint32_t)
            0, // system_status             : System status flag, see MAV_STATE ENUM (uint8_t)
            3 // mavlink_version           : MAVLink version, not writable by user, gets added by protocol because of magic data type: uint8_t_mavlink_version (uint8_t)
            // We set mavlink_version to 3 because it matches the magic we see elsewhere in incoming packets :) it's Mavlink 1.0.
        );
    }
    log.heartbeat('Sending GCS heartbeat to UAV...');
    this.sendAsGcs(heartbeatMessage);
};

UavConnection.prototype.getUSBSerial = function() {
    var usbSerialPath = (os.platform() === 'darwin') ? '/dev/cu.usbserial-*' : '/dev/ttyUSB*';

    if (config.get('serial:device') === 'auto'){
        log.silly('[UavConnection] usb serial: auto-detecting');
        return glob.sync(usbSerialPath)[0];

    }else{
        log.silly('[UavConnection] usb serial: reading from config file');
        return config.get('serial:device')
    }

}

UavConnection.prototype.disconnected = function() {

    // Reset this because we've lost (or never had) the physical connection;
    // clear/restart heartbeats + other connection information.
    lastHeartbeat = undefined;
    timeSinceLastHeartbeat = undefined;
    isConnected = false;
    clearInterval(heartbeatMonitor); // harmless if timer is not defined
    clearInterval(sendHeartbeatInterval); // harmless if timer is not defined
    heartbeatMonitor = setInterval(this.heartbeat, config.get('connection:updateIntervals:heartbeatMs'));
    attachDataEventListener = true; // be sure and listen for the regained heartbeat

    log.silly('[UavConnection] Trying to connect from disconnected state...');

    try {

        switch (config.get('connection:type')) {
            case 'serial':
                // Note that our error handling around the serial port is a bit weak, simply
                // reporting it to the logger as an error.  At this point, it's not clear what all
                // errors we'll see or what they mean, so I'm OK with just logging + ignoring
                // these errors at this point.

                dataEventName = 'data';

                var serialDevice = this.getUSBSerial();
                log.silly('[UavConnection] usb serial is using ', serialDevice);

                connection = new SerialPort(
                    serialDevice, {
                        baudrate: config.get('serial:baudrate'),
                        // See:
                        // https://github.com/voodootikigod/node-serialport/issues/284
                        //
                        // We need this callback specified both here and with the 'close' event until that
                        // issue is resolved, because it's unclear where they may differ in internal
                        // execution.
                        disconnectedCallback: _.bind(this.changeState, this, 'disconnected')
                    }
                );

                connection.on('error', function(err) {
                    log.error('error establishing serial connection: ' + err);
                });

                // Once the connection is opened, move to a connecting state
                connection.on('open', _.bind(this.changeState, this, 'connecting'));

                // If we lose the connection, try and re-establish immediately.
                // See above where we specify in disconnectedCallback as well.
                connection.on('close', _.bind(this.changeState, this, 'disconnected'));
                break;

            case 'udp':
                connection = dgram.createSocket('udp4');
                dataEventName = 'message';

                // When the socket confirms its listening, change state to try and collect MAVLink configuration
                connection.on('listening', _.bind(this.changeState, this, 'connecting'));
                connection.bind(config.get('udp:port'));
                break;

            case 'tcp':
                dataEventName = 'data';
                connection = net.connect({
                    host: config.get('tcp:host'),
                    port: config.get('tcp:port')
                }, _.bind(function() {
                    // 'connect' event listener
                    log.verbose('[UavConnection] TCP connection established on port ' + config.get('tcp:port'));
                    this.changeState('connecting');
                }, this));

                // We need to handle the 'error' event for TCP connections, otherwise its default behavior is to
                // throw an exception, which may not be what is expected in the surrounding code.
                connection.on('error', function(e) {
                    // Don't spam the error log.  May want to expand this logic for everywhere in this code, too.
                    if (lastError != e.code) {
                        log.error('[UavConnection] TCP connection error message: ' + e);
                    }
                    lastError = e.code;
                });
                break;

            default:
                log.error('Connection type not understood (%s)', config.get('connection:type'));
        }
    } catch (e) {
        log.error('error', util.inspect(e));
    }
};

// This state attaches listeners for a heartbeat from the protocol.
// The heartbeat monitor will switch the connection to 'connected' when it sees heartbeats.
UavConnection.prototype.connecting = function() {
    try {
        isConnected = false;

        log.silly('establishing MAVLink connection...', {
            ifAttach: attachDataEventListener
        });

        // If necessary, attach the message parser to the connection.
        // This is only done the first time the connection reaches this state after first connecting,
        // to avoid attaching too many callbacks.
        if (true === attachDataEventListener && false === isAttached) {

            protocol.on('HEARTBEAT', function heartbeatListener(m) {
                log.silly('Got a heartbeat from the APM');
            });

            isAttached = true;
            log.silly('attaching data event listener & connection bindings in UavConnection')

            // One time, wait for a heartbeat then set the srcSystem / srcComponent
            // Possible loose ends here.  TODO GH#195.
            protocol.once('HEARTBEAT', function handleFirstHeartbeat(msg) {

                uavSysId = msg.header.srcSystem;
                uavComponentId = msg.header.srcComponent;
                protocol.srcSystem = uavSysId;
                protocol.srcComponent = uavComponentId;

                // This code is mainly to warn if there's misalignment
                // with the parameter vs. the heartbeat.  TODO GH#195.
                // We issue this request here because the heartbeats are slower
                // than issuing the request for the parameter (lower frequency),
                // so we wnat to get a heartbeat before checking if there's parameter
                // misalignment.
                mavParam.get('SYSID_THISMAV')
                    .then(_.bind(function(sysid_thismav) {
                        if (sysid_thismav !== uavSysId) {
                            log.warn('UAV parameter SYSID_THISMAV does not match heartbeat srcSystem! %d %d', sysid_thismav, uavSysId);
                        } else {
                            log.debug('Confirmed, SYSID_THISMAV matches heartbeat.srcSystem OK');
                        }
                    }, this))
                    .fail(function(e) {
                        log.error(util.inspect(e));
                    });

            });

            // TODO GH#124, remove specific MAVLink protocol commands from this object
            protocol.on('HEARTBEAT', this.updateHeartbeat);

            // When binary data is received, write it to the binary received log and then pass it to the protocol
            // handler for decoding.
            connection.on(dataEventName, this.handleDataEvent);

            var mavParam = new MavParams(protocol, this, log);

            // With the connection established, fetch and set the GCS SysID and UAV SysIDs,
            // both here and on the protocol itself.
            mavParam.get('SYSID_MYGCS')
                .then(_.bind(function(sysid_mygcs) {
                    gcsSysId = sysid_mygcs;
                    log.debug('Got GCS sysid %d', sysid_mygcs);
                    if (gcsSysId !== config.get('identities:gcsId')) {
                        log.error('GCS ID mismatch between UAV and local GCS.');
                    }
                }, this))
                .fail(function(e) {
                    log.error(util.inspect(e));
                });
        }

        // Don't do this twice.
        attachDataEventListener = false;

        // Are we in a hard lost-link condition and need to re-establish the port?
        if (
            timeSinceLastHeartbeat > config.get('connection:timeout:hard')
        ) {

            log.warn('Hard loss of link, returning to Disconnected state in UavConnection');
            attachDataEventListener = true;
            protocol.removeListener('HEARTBEAT', this.updateHeartbeat);
            connection.removeListener(dataEventName, this.handleDataEvent);
            this.closeConnection();

        }

    } catch (e) {
        log.error(e);
        throw (e);
    }
};

// Close the connection, switching back to disconnected state when done.
// Some transports can do this after a callback, others not.
UavConnection.prototype.closeConnection = function() {
    log.debug('Closing connection in UavConnection');
    var callback = _.bind(function() {
        this.changeState('disconnected');
    }, this);

    switch (config.get('connection:type')) {
        case 'tcp':
            connection.end();
            this.changeState('disconnected');
            break;
        case 'udp':
            connection.close();
            this.changeState('disconnected');
            break;
        case 'serial':
            connection.close(callback);
            break;
        default:
            log.error('Unknown connection type attempted in UavConnection.closeConnection()');
            this.changeState('disconnected');
    }
};

UavConnection.prototype.handleDataEvent = function(message) {
    receivedBinaryLog.write(message);
    latestBinaryLog.write(message);
    protocol.parseBuffer(message);
};

// Helper method to request the data stream, needs to be bound in this scope to avoid being called often.
UavConnection.prototype.requestDataStream = _.once(function() {
    var request = new mavlink.messages.request_data_stream(
        uavSysId, // target system
        uavComponentId, // target component
        mavlink.MAV_DATA_STREAM_ALL, // get all data streams
        config.get('connection:updateIntervals:streamHz'), // rate, Hz
        1 // start sending this stream (0=stop)
    );
    log.silly('Requesting data streams at interval %d...', config.get('connection:updateIntervals:streamHz'));
    this.sendAsGcs(request);
});

UavConnection.prototype.startSendingHeartbeats = _.once(function() {
    return setInterval(
        _.bind(this.sendHeartbeat, this),
        config.get('connection:updateIntervals:sendHeartbeatMs')
    )
});

// Upon connection for the first time, request all MAVLink data streams available.
// Also switch back to 'connecting' state in case we lose the link.
UavConnection.prototype.connected = function() {

    this.requestDataStream();
    sendHeartbeatInterval = this.startSendingHeartbeats();

    // If connection has been regained, signal the client.
    if (true === lostConnection) {
        log.info('Connection re-established from lost state.');
        lostConnection = false;
        this.emit('connection:regained');
    }

    // Have we lost link?  True if we're timing out and have connected previously.
    if (
        (
            timeSinceLastHeartbeat > config.get('connection:timeout:soft')
            || true === _.isNaN(timeSinceLastHeartbeat)
        ) && true === hasConnected
    ) {
        this.emit('connection:lost');
        log.warn('Connection lost, time since last heartbeat was [%d], soft timeout is [%d].', timeSinceLastHeartbeat, config.get('connection:timeout:soft'));
        lostConnection = true;
        this.changeState('connecting');
    }

    hasConnected = true;
};

// We have a special case with APM/MAVLink where two message types will be checked for the specific
// ID corresponding to the MY_GCSID parameter (default 255) -- heartbeat and rc_override.  We can do
// that inline, but let's be noisy about it by putting that code here.  In the future, perhaps this should migrate
// into the MAVLink protocol implementation itself  (TODO GH#195)
// Log and write to binary log/transport layer.
// Parameter is a mavlink message object instance. (TODO GH#124)
UavConnection.prototype.sendAsGcs = function(message) {
    var buf = new Buffer(message.pack(protocol.seq, config.get('identities:gcsId'), config.get('identities:gcsComponent')));
    sentBinaryLog.write(buf);
    connection.write(buf);
    // TODO GH#195 -- we need to move this code by refactoring the Mavlink JS generator
    protocol.seq = (protocol.seq + 1) % 255;
    protocol.total_packets_sent += 1;
    protocol.total_bytes_sent += buf.length;
};

exports.UavConnection = UavConnection;
