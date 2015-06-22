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
    'Models/Connection'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection) {

    var Routine = Backbone.Model.extend({

        defaults: {
            'connected': false,
            'paramsLoaded': false,
            'missionLoaded': false
        },

        // Simple flag so we don't re-render the Fly view once it's been done, which causes the DOM/events to get
        // redrawn and then confused when switching between Mission/Engineering views.
        // Was GH#298.  More complex issues about managing client side application state still exist, though.
        flightInProgress: false,

        initialize: function() {
            _.bindAll(this, 'planning', 'preflight', 'fly', 'postflight', 'bindServerClientSocketEvents');
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
            var parametersUploadedDeferred = Q.defer(); // After custom params loaded onto APM
            var preflightCompletedDeferred = Q.defer(); // will be resolved when all others are done + user confirms OK

            try { // catch exceptions hidden by Q
                var preflightView = new this.PreflightView({
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
                app.socket.emit('startConnection');
                app.socket.on('linkStatus', _.bind(function(linkStatus) {
                    this.connection.set(linkStatus);
                }, this));
            } catch (e) {
                console.log(e);
                throw (e);
            }


            // Saving this code for a refactoring swamp.  TODO GH#164
            // Upload specific parameters if SITL.
            // We need this ONLY if we're flying SITL.  This is because some params
            // need to be set after the SITL has been wiped/nuked.
            // Upload specific parameters if defined in parameters file
            // In the future, this may actually manage real parameters for other platforms.
            if (false !== appConfig.platforms[this.get('mission').get('platformId')].parameters) {

                this.on('change:connected', _.bind(function(model) {

                    var parametersLoaded = _.bind(function() {
                        this.set({
                            'paramsLoaded': true
                        });
                        parametersUploadedDeferred.resolve();
                        $('#loadParameters .connecting').hide();
                        $('#loadParameters .connected').show();
                    }, this);

                    Q($.get('/drone/params/load')).then(_.bind(function(data) {
                        parametersLoaded();
                    }, function(xhr) {
                        // on failure
                        console.log(xhr);
                    }, this));

                    $('#loadParameters .disconnected').hide();
                    $('#loadParameters .connecting').show();

                }, this));
            }

            return preflightCompletedDeferred.promise;

        },

        // For children to implement.
        fly: function() {},

        //For children to implement.
        postflight: function() {},

        // Bind server-client event bridges.
        bindServerClientSocketEvents: function() {

            // Hook up platform-based updates.
            // The socket connection is established in the BaseRoutine/preflight code.
            app.socket.on('platform', _.bind(function(platformJson) {
                try {
                    this.platform.set(platformJson);
                } catch (e) {
                    console.log(e);
                }
            }, this));

            app.socket.on('operator:promoted', _.bind(function(operator) {

                // TODO GH#219, improve ID management here.
                if (app.socket.io.engine.id === operator) {
                    this.get('mission').isOperator = true;
                    try {
                        this.flyView.render();
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log('Got promotion event for someone else');
                }

            }, this));

            app.socket.on('operator:demoted', _.bind(function() {
                if (false !== this.get('mission').isOperator) {
                    try {
                        this.get('mission').isOperator = false;
                        this.flyView.render();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }, this));
        }

    });

    return Routine;

});
