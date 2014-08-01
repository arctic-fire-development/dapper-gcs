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
    moment = require('moment'),
    mavlink = require('mavlink_ardupilotmega_v1.0'),
    MavParams = require('./mavParam');

// log is expected to be a winston instance; keep it in the shared global namespace for convenience.
var log;

// receivedBinaryLog is the writable stream where all incoming buffer data from the UAV will be written.
var receivedBinaryLog;

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

// handler for the Heartbeat setInterval() invocation
var heartbeatMonitor = false;

// Time of the last heartbeat packet was received (timestamp)
var lastHeartbeat = undefined;

// Time elapsed since last heartbeat
var timeSinceLastHeartbeat = undefined;

// If true, then this connection has previously been established.
// Used to convey if the connection has been temporarily lost.
var hasConnected = false;

// Set to true if the connection is in a lost state.
var lostConnection = false;

// Incoming config is an nconf instance, already read in the server code.
// Protocol Parser is a mavlink instance
// log is a Winston logger, already configured + ready to use
function UavConnection(configObject, protocolParser, logObject) {

    _.bindAll(this, 'closeConnection', 'handleDataEvent', 'changeState', 'heartbeat', 'invokeState', 'start', 'getState', 'updateHeartbeat', 'disconnected', 'connecting', 'connected', 'write');

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

    var logTime = moment().format('-MM-DD-YYYY-HH-MM-ss');
    receivedBinaryLog = fs.createWriteStream(config.get('logging:root') + config.get('logging:receivedBinary') + logTime);
    receivedBinaryLog.on('error', function(err) {
        log.error(err);
    });
    sentBinaryLog = fs.createWriteStream(config.get('logging:root') + config.get('logging:sentBinary') + logTime);
    sentBinaryLog.on('error', function(err) {
        log.error(err);
    });
    
};

// Explicitly close the streams to ensure all data is flushed to disk.
UavConnection.prototype.stopLogging = function() {
    receivedBinaryLog.end();
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

    this.invokeState(this.state);
    log.silly('time since last heartbeat: %d', timeSinceLastHeartbeat);
};

// Convenience function to make the meaning of the awkward syntax more clear.
UavConnection.prototype.invokeState = function() {
    this[this.state]();
};

UavConnection.prototype.start = function() {
    
    if(true === started) {
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
        log.silly('Heartbeat updated: ' + Date.now());
        lastHeartbeat = Date.now();

        // When we get a heartbeat, switch back to connected state.
        if(false === isConnected) {
            isConnected = true;
            timeSinceLastHeartbeat = 0; // fake this so we don't flicker between connected/connecting
            this.changeState('connected');
        }
    } catch(e) {
        log.error(util.inspect(e));
        throw(e);
    }
};

UavConnection.prototype.disconnected = function() {

    // Reset this because we've lost (or never had) the physical connection;
    // clear/restart heartbeats + other connection information.
    lastHeartbeat = undefined;
    timeSinceLastHeartbeat = undefined;
    isConnected = false;
    clearInterval(heartbeatMonitor);
    heartbeatMonitor = setInterval(this.heartbeat, config.get('connection:updateIntervals:heartbeatMs'));

    log.silly('[UavConnection] Trying to connect from disconnected state...');

    try {

        switch (config.get('connection:type')) {
            case 'serial':
                dataEventName = 'data';
                connection = new SerialPort(
                    config.get('serial:device'), {
                        baudrate: config.get('serial:baudrate')
                    }
                );

                // Once the connection is opened, move to a connecting state
                connection.on('open', _.bind(this.changeState, this, 'connecting'));

                // If we lose the connection, try and re-establish immediately.
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
                    log.error('[UavConnection] TCP connection error message: ' + e);
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

        log.silly('establishing MAVLink connection...');

        // If necessary, attach the message parser to the connection.
        // This is only done the first time the connection reaches this state after first connecting,
        // to avoid attaching too many callbacks.
        if (true === attachDataEventListener) {

            // One time, wait for a heartbeat then set the srcSystem / srcComponent
            // Possible loose ends here.  TODO GH#195.
            protocol.once('HEARTBEAT', function(msg) {

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
                        if(sysid_thismav !== uavSysId) {
                            log.warn('UAV parameter SYSID_THISMAV does not match heartbeat srcSystem! %d %d', sysid_thismav, uavSysId);
                        } else {
                            log.debug('Confirmed, SYSID_THISMAV matches heartbeat.srcSystem OK');
                        }
                    }, this))
                    .fail(function(e) { log.error(util.inspect(e)); });

            });

            // TODO GH#124, remove specific MAVLink protocol commands from this object
            protocol.on('HEARTBEAT', this.updateHeartbeat);

            // When binary data is received, write it to the binary received log and then pass it to the protocol
            // handler for decoding.
            connection.on(dataEventName, this.handleDataEvent);

            var mavParam = new MavParams(protocol, log);

            // With the connection established, fetch and set the GCS SysID and UAV SysIDs,
            // both here and on the protocol itself.
            mavParam.get('SYSID_MYGCS')
                .then(_.bind(function(sysid_mygcs) {
                    gcsSysId = sysid_mygcs;
                    log.debug('Got GCS sysid %d', sysid_mygcs);
                }, this))
                .fail(function(e) { log.error(util.inspect(e)); });
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
    protocol.parseBuffer(message);
};

// Upon connection for the first time, request all MAVLink data streams available.
// Also switch back to 'connecting' state in case we lose the link.
UavConnection.prototype.connected = function() {

    // Only do this once upon obtaining connection.
    // The rate parameter of the data stream seems to be in Hz.
    var request_data_stream = _.once(_.bind(function() {
        var request = new mavlink.messages.request_data_stream(
            uavSysId, // target system
            uavComponentId, // target component
            mavlink.MAV_DATA_STREAM_ALL, // get all data streams
            config.get('connection:updateIntervals:streamHz'), // rate, Hz
            1 // start sending this stream (0=stop)
        );
        var p = new Buffer(request.pack());
        this.write(p);
    }, this));
    request_data_stream();

    // If connection has been regained, signal the client.
    if(true === lostConnection) {
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
        log.warn('Connection lost.');
        lostConnection = true;
        this.changeState('connecting');
    }

    hasConnected = true;
};

// Log and write to binary log/transport layer.
// Data is expected to be of type Buffer.
UavConnection.prototype.write = function(data) {
    switch (config.get('connection:type')) {
        case 'tcp': // fallthrough
        case 'serial':
            sentBinaryLog.write(data);
            connection.write(data);
            break;
        case 'udp':
            // special case, don't do anything.
            break;
    }
};

exports.UavConnection = UavConnection;