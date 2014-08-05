'use strict';
/* globals require, exports, util, events */

var _ = require('underscore'),
  // We share the model code with the client, which needs a few tricks to work.
  // TODOGH#xxx
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

  this.missionModel = new MissionModel();

  _.bindAll(this, 'socketHandlers', 'get');
  
  // Hook up various URL/socket endpoints handled here
  app.get('/routine', this.get);
  io.on('connection', this.socketHandlers);

}

util.inherits(Routine, events.EventEmitter);

Routine.prototype = {

  get: function(req, res) {
    res.json(this.missionModel.toJSON());
  },

  // TODO GH#206
  socketHandlers: function(socket) {
    socket.on('preflight', function() {
      log.info('routine thinks someone is starting preflight, signaling other connected clients to freeze');
    });
    socket.on('routine:update', _.bind(function(data) {
      this.missionModel.set(data);
      socket.emit('routine:update', this.missionModel.toJSON());
    }, this));

    // When a routine is started, signal other clients.
    socket.on('routine:started', function() {
      socket.broadcast.emit('routine:started');
    });
  }
};

module.exports = Routine;