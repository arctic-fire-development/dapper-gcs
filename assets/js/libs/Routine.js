'use strict';
/* globals require, exports, util, events */

var _ = require('underscore'),
    // We share the model code with the client, which needs a few tricks to work.
    // TODO GH#xxx
    MissionModel = require('../../../app/Models/Mission');

// Reference to global socket.io -- probably move elsewhere, just exploring for now.
// Socket.io instance.
var io;

// Shared logging instance.
var log;

// Express app instance
var app;

function Routine(logger, appInstance, socketIo) {
    log = logger;
    io = socketIo;
    app = appInstance;

    this.mission = new MissionModel();

    _.bindAll(this, 'socketHandlers', 'get');

    // Hook up various URL/socket endpoints handled here
    app.get('/routine', this.get);
    io.on('connection', this.socketHandlers);

}

util.inherits(Routine, events.EventEmitter);

Routine.prototype = {

    get: function(req, res) {
        log.debug(this.mission.toJSON());
        res.json(this.mission.toJSON());
    },

    // TODO GH#206
    socketHandlers: function(socket) {
        socket.on('preflight', function() {
            log.info('routine thinks someone is starting preflight, signaling other connected clients to freeze');
        });
        socket.on('routine:update', _.bind(function(data) {
            this.mission.set(data);
            socket.emit('routine:update', this.mission.toJSON());
        }, this));

        // When a routine is started, signal other clients.
        socket.on('routine:started', function() {
            socket.broadcast.emit('routine:started');
        });

        // When a routine is ended, signal other clients.
        socket.on('routine:ended', function() {
            log.info('Routine is ending...');
            socket.broadcast.emit('routine:ended');
        });

        socket.on('launching', function() {
            log.info('Launching vehicle');
            socket.broadcast.emit('launching');
        });

        socket.on('drone:flyToPoint:start', function(p) {
            socket.broadcast.emit('drone:flyToPoint:start', p);
        });

        socket.on('drone:flyToPoint:stop', function() {
            socket.broadcast.emit('drone:flyToPoint:stop');
        });
    }
};

module.exports = Routine;
