'use strict';

// Set up this module to be used both on the client & server, so we need
// both AMD and CommonJS style module loaders.
// TODO GH#196
// http://esa-matti.suuronen.org/blog/2013/03/22/journey-from-requirejs-to-browserify/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'backbone'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        factory(exports, require('backbone'));
    } else {
        // Browser globals
        factory((root.commonJsStrict = {}), root.Backbone);
    }
}(this, function (exports, Backbone) {

    var Mission = Backbone.Model.extend({
      url: 'routine',
      defaults: {
        platformId: 0,
        payload: '',
        mission: 'freeFlight',
        status: 'not started',
        failsafeBehavior: 'rtl',
        active: false,
        maxSpeed: 7, //  m/s
        maxAltitude: 120, // meters
        takeoffAltitude: 20 // meters
      },

      // Flag indicating if this client GUI is the operator of this mission.
      // We don't want this property to persist via shared state to other clients,
      // so it's not in the attributes list.
      isOperator: false,

      // Here, we set up the appropriate reference to the socket depending
      // on if it's client or server.
      constructor: function(attr, options) {

        // Fake out the socket?  Is this OK?
        // Let's let this stay while we figure out good patterns for this kind of shared code
        // plus realtime distributed sync.  Other libraries are capable of replacing the
        // Backbone.sync with socket.io stuff, but that's slightly _not_ what we want,
        // and some of the documentation/currency of those libraries is suspicious.
        if( options && options.socket ) {
          this.socket = options.socket;
        } else {
          this.socket = {
            on: function() { return; },
            emit: function() { return; }
          }
        }

        Backbone.Model.apply(this, arguments);
      },

      initialize: function() {
        _.bindAll(this, 'syncToServer', 'syncFromServer');
        this.on('change', this.syncToServer);
        this.socket.on('routine:update', this.syncFromServer);
      },

      syncToServer: function() {
        this.socket.emit('routine:update', this.toJSON());
      },

      syncFromServer: function(json) {
        this.set(json);
      }

    });

    // attach properties to the exports object to define
    // the exported module properties.
    if(typeof module === 'object') {
      module.exports = Mission;
    } else {
      return Mission;
    }
}));
