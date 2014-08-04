'use strict';
/*global define, console, alert */
define([

    // Application + dependencies
    'app',
    'underscore',
    'jquery',
    'q',
    'backbone',

    // Models
    'Models/Mission',
    'Models/Platform',
    'Models/Connection',
    'routines/freeFlight/models/Planning',

    // Dependent views
    'routines/freeFlight/views/Planning',
    'routines/freeFlight/views/Preflight',
    'routines/freeFlight/views/Fly'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    PlanningModel,
    PlanningView,
    PreflightView,
    FlyView
) {

    var Routine = Backbone.Model.extend({

        defaults: {
            'connected': false,
            'paramsLoaded': false,
            'missionLoaded': false
        },

        initialize: function() {
            _.bindAll(this, 'planning', 'preflight', 'fly');
            this.socket = app.socket;
            this.connection = new Connection();
            this.platform = new Platform();
            this.planningModel = new PlanningModel();
            this.connection.on('change:status', _.bind(function(model) {
                if(model.get('status') === 'connected') {
                    this.set({ 'connected' : true});
                }
            }, this));
        },

        planning: function() {
            var deferred = Q.defer();
            var planningView = new PlanningView({
                deferred: deferred,
                mission: this.get('mission')
            }).render();
            return deferred.promise;
        },

    preflight: function(preflightCompletedDeferred) {

        // A few promises for keeping track of various async processes.
        var connectionEstablishedDeferred = Q.defer(); // After connection is confirmed with UAV
        
        try { // catch exceptions hidden by Q
            var preflightView = new PreflightView( {
                deferred: preflightCompletedDeferred,
                model: this.connection,
                mission: this.get('mission'),
                parameters: appConfig.platforms[this.get('mission').get('platformId')].parameters
            }).render();
        } catch(e) {
            console.log(e);
            throw(e);
        }

        try {
            // Initalize connection.
            this.socket.emit('startConnection');
            this.socket.on('linkStatus', _.bind(function(linkStatus) {
                this.connection.set(linkStatus);
            }, this));
        } catch(e) {
            console.log(e);
        }

    },

    // For children to implement.
    fly: function() {},

    postflight: function() {
        alert('postflight');
        return true;
    }
    });

    return Routine;

});