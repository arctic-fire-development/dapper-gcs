/*
This module is responsible for managing the overall status and health of the UAV connection.
This has two different layers of purpose:
- detect and manage the socket
- handle MAVLink connection
*/

var SerialPort = require("serialport").SerialPort,
    util = require('util'),
    child = require("child_process"),
    dgram = require("dgram"),
    net = require('net'),
    _ = require('underscore');

// log is expected to be a winston instance; keep it in the shared global namespace for convenience.
var log;

// Incoming config is an nconf instance, already read in the server code.
// Protocol Parser is a mavlink instance
// log is a Winston logger, already configured + ready to use

function UavConnection(configObject, protocolParser, logObject) {

    _.bindAll(this, 'changeState', 'heartbeat', 'invokeState', 'start', 'getState', 'updateHeartbeat', 'disconnected', 'connecting', 'connected', 'write');

    // config is an nconf instance
    this.config = configObject;

    // If true, then a connection has been initiated.
    this.started = false;

    // True if we're receiving heartbeat packets from the wire protocol
    this.isConnected = false;

    // connection represents the socket-level connection through which MAVLink arrives
    this.connection = undefined;

    // name of the message the connection uses to signal that new data is ready to consume
    this.dataEventName = undefined;

    // name of current state of object
    this.state = 'disconnected';

    // protocol is the parser for the incoming binary stream (MAVLink)
    this.protocol = protocolParser;

    // this flag is set to true if the event listener must be reattached to the connection, in case
    // the connection itself was lost
    this.attachDataEventListener = true;

    // Time of the last heartbeat packet was received (timestamp)
    this.lastHeartbeat = undefined;

    // Time elapsed since last heartbeat
    this.timeSinceLastHeartbeat = undefined;

    log = logObject;

};

util.inherits(UavConnection, events.EventEmitter);

UavConnection.prototype.changeState = function(newState) {
    this.state = newState;
    this.emit(this.state);
    log.verbose('[UavConnection] Changing state to [' + this.state + ']');
    this.invokeState(this.state);
};

// The heartbeat function is invoked once per second and is kicked off by the start() function.
// The point is to update some timing information and re-invoke whatever current state
// the system is in to see if we need to change state/status.
UavConnection.prototype.heartbeat = function() {

    this.timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    this.emit(this.state);
    this.emit('heartbeat');

    this.invokeState(this.state);
    log.silly('time since last heartbeat: '+this.timeSinceLastHeartbeat);
};

// Convenience function to make the meaning of the awkward syntax more clear.
UavConnection.prototype.invokeState = function(state) {
    this[this.state]();
};

UavConnection.prototype.start = function() {
    
    if(true === this.started) {
        log.warn('Asked to start connection manager, but connection already started, refused.');
        return;
    }

    log.info('Starting connection manager...');
    this.started = true;

    setInterval(_.bind(this.heartbeat, this), 1000);
    this.changeState('disconnected');
};

// Accessor for private variable (stateName)
UavConnection.prototype.getState = function() {
    return this.state;
};

// Update the remote heartbeat's last timestamp
UavConnection.prototype.updateHeartbeat = function() {
    
    this.emit('heartbeat:packet');
    log.silly('Heartbeat updated: ' + Date.now());
    this.lastHeartbeat = Date.now();

    // When we get a heartbeat, switch back to connected state.
    if(false === this.isConnected) {
        this.isConnected = true;
        this.changeState('connected');
    }
};

UavConnection.prototype.disconnected = function() {

    // Reset this because we've lost (or never had) the physical connection
    this.lastHeartbeat = undefined;
    this.isConnected = false;

    // Request the protocol be reattached.
    this.attachDataEventListener = true;

    log.silly('[UavConnection] Trying to connect from disconnected state...');

    try {

        switch (this.config.get('connection')) {
            case 'serial':
                this.dataEventName = 'data';
                this.connection = new SerialPort(
                    this.config.get('serial:device'), {
                        baudrate: this.config.get('serial:baudrate')
                    });

                // Once the connection is opened, move to a connecting state
                this.connection.on('open', _.bind(this.changeState, this, 'connecting'));

                // If we lose the connection, try and re-establish immediately.
                this.connection.on('close', _.bind(this.changeState, this, 'disconnected'));
                break;

            case 'udp':
                this.connection = dgram.createSocket("udp4");
                this.dataEventName = 'message';

                // When the socket confirms its listening, change state to try and collect MAVLink configuration
                this.connection.on("listening", _.bind(this.changeState, this, 'connecting'));
                this.connection.bind(this.config.get('udp:port'));
                break;

            case 'tcp':
                this.dataEventName = 'data';
                this.connection = net.connect({
                    host: this.config.get('tcp:host'),
                    port: this.config.get('tcp:port')
                }, _.bind(function() {
                    // 'connect' event listener
                    log.verbose('[UavConnection] TCP connection established on port ' + this.config.get('tcp:port'));
                    this.changeState('connecting');
                }, this));

                // We need to handle the 'error' event for TCP connections, otherwise its default behavior is to
                // throw an exception, which may not be what is expected in the surrounding code.
                this.connection.on('error', function(e) {
                    log.error("[UavConnection] TCP connection error message: " + e);
                });
                break;

            default:
                log.error('Connection type not understood (%s)', this.config.get('connection'));
        }
    } catch (e) {
        log.error('error', e);
    }
};

// This state attaches listeners for a heartbeat from the protocol.
// The heartbeat monitor will switch the connection to 'connected' when it sees heartbeats.
UavConnection.prototype.connecting = function() {
    try {

        this.isConnected = false;

        log.silly('establishing MAVLink connection...');

        // If necessary, attach the message parser to the connection.
        // This is only done the first time the connection reaches this state after first connecting,
        // to avoid attaching too many callbacks.
        if (this.attachDataEventListener === true) {

            this.connection.on(this.dataEventName, _.bind(function(msg) {
                this.protocol.parseBuffer(msg);
            }, this));

            this.protocol.on('HEARTBEAT', _.bind(this.updateHeartbeat, this));
            this.emit('connecting:attached');

        }

        this.attachDataEventListener = false;

    } catch (e) {
        log.error('Error!', e);
        throw (e);
    }
};

UavConnection.prototype.connected = function() {

    if (this.timeSinceLastHeartbeat > 5000 || true === _.isNaN(this.timeSinceLastHeartbeat)) {
        this.changeState('connecting');
    }

};

UavConnection.prototype.write = function(data) {
    switch (this.config.get('connection')) {
        case 'tcp': // fallthrough
        case 'serial':
            this.connection.write(data);
            break;
        case 'udp':
            // special case, don't do anything.
            break;
    }
};

exports.UavConnection = UavConnection;
/*

// This function changes the initial requested data stream to get all data, at a rate of 1hz
var request_data_stream = _.once(_.bind(function(done) {
request = new mavlink.messages.request_data_stream(1, 1, mavlink.MAV_DATA_STREAM_ALL, 1, 1);
_.extend(request, {
srcSystem: 255,
srcComponent: 0,
seq: 1
});

protocol.on('message', function(message) {
log.info(message.name);
});

p = new Buffer(request.pack());

log.info(p);
connection.write(p);
}, this));

*/