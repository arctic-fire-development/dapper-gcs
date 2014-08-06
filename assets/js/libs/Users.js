'use strict';
/* globals module, util, events, require */

var _ = require('underscore');

// Winston logging object
var log;

// Socketio server object
var io;

// Array of all connected clients
var connections = {};

// Socket ID of promoted operator
var operator;

function Users(logger, socketIo) {
    log = logger;
    io = socketIo;

    _.bindAll(this, 'handleNewConnection');

    // Auth/connection middleware
    io.use(this.handleNewConnection);

}

util.inherits(Users, events.EventEmitter);

Users.prototype.handleNewConnection = function(socket, next) {

    // If a client requests, resend a promotion notification.
    socket.on('operator:promote', this.assignOperator);

    // Force promotion of a specific client (when starting a mission, etc),
    // and demote other clients.
    socket.on('operator:promote:force', function() {
        operator = socket.id;
        socket.emit('operator:promoted', operator);
        socket.broadcast.emit('operator:demoted');
    });

    // Attach disconnect handlers
    socket.on('disconnect', _.bind(function() {
        log.info('Disconnecting socket connection %s', socket.id);
        delete connections[socket.id];
        this.assignOperator();
    }, this));

    // TODO GH#199 implement authentication here
    // For now we just use this to ensure we're not getting spammed by a single client.
    if( _.has(connections, socket.id)) {
        log.debug('Connection %s already exists in pool, rejecting connection attempt', socket.id);
        next(new Error('SocketIO connection already exists for this ID.'));
    } else {
        log.info('Connection ID %s connected and accepted', socket.id);
        connections[socket.id] = {
            socket: socket,
            timestamp: socket.handshake.issued
        };
        this.assignOperator(socket);
        next();
    }
};

Users.prototype.assignOperator = function(socket) {
    var connectionsOrderedByTimestamp = _.sortBy(connections, 'timestamp');

    switch(_.size(connections)) {
        case 0:
            log.warn('No active connections present.');
            break;

        // If only one connection exists, that person is the operator.
        // Pick the longest-connected client and promote it to operator.
        case 1: // fallthrough -- code for 1..n other connections should be identical here.
        default:
            if( operator !== connectionsOrderedByTimestamp[0].socket.id ) {
                operator = connectionsOrderedByTimestamp[0].socket.id;
                connections[operator].socket.emit('operator:promoted', operator);
                log.info('Promoting connection ID %s to operator', operator);
            }

            // Demote other clients.  GH#203.
            connections[operator].socket.broadcast.emit('operator:demoted');

            break;
    }

};

module.exports = Users;