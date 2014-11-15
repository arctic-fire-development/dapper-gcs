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

    // Dependent views
    'routines/freeFlight/views/Planning',
    'routines/freeFlight/views/Preflight',
    'routines/freeFlight/views/Fly',
    'routines/freeFlight/views/PostRoutine'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    PlanningView,
    PreflightView,
    FlyView,
    PostRoutineView) {

    var Routine = Backbone.Model.extend({

        defaults: {
            'connected': false,
            'paramsLoaded': false,
            'missionLoaded': false
        },

        initialize: function() {
            _.bindAll(this, 'planning', 'preflight', 'fly', 'postroutine');
            this.socket = app.socket;
            this.connection = new Connection();
            this.platform = new Platform();
            this.connection.on('change:status', _.bind(function(model) {
                if (model.get('status') === 'connected') {
                    this.set({
                        'connected': true
                    });
                }
            }, this));
        },

        planning: function() {
            // For clients to implement.
        },

        preflight: function(preflightCompletedDeferred) {

            // A few promises for keeping track of various async processes.
            var connectionEstablishedDeferred = Q.defer(); // After connection is confirmed with UAV

            try { // catch exceptions hidden by Q
                var preflightView = new PreflightView({
                    deferred: preflightCompletedDeferred,
                    model: this.connection,
                    mission: this.get('mission'),
                    parameters: appConfig.platforms[this.get('mission').get('platformId')].parameters
                }).render();
            } catch (e) {
                console.log(e);
                throw (e);
            }

            try {
                // Initalize connection.
                this.socket.emit('startConnection');
                this.socket.on('linkStatus', _.bind(function(linkStatus) {
                    this.connection.set(linkStatus);
                }, this));
            } catch (e) {
                console.log(e);
                throw (e);
            }

        },

        // For children to implement.
        fly: function() {},

        //For children to implement.
        postroutine: function() {}

    });

    return Routine;

});
