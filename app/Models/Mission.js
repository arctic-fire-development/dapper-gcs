'use strict';

// Set up this module to be used both on the client & server, so we need
// both AMD and CommonJS style module loaders.
// TODO GH#xxx
// http://esa-matti.suuronen.org/blog/2013/03/22/journey-from-requirejs-to-browserify/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'backbone'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        factory(exports, require('Backbone'));
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
        active: false
      },

      // Here, we set up the appropriate reference to the socket depending
      // on if it's client or server.
      constructor: function(attr, options) {

        // Fake out the socket?  Is this OK?
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
        console.log('synchronizing to server');
        console.log(this.socket);
        this.socket.emit('routine:update', this.toJSON());
      },

      syncFromServer: function(json) {
        console.log('got info from server syncing')
        console.log(json);
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