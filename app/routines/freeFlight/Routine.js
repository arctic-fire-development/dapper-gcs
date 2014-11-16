'use strict';

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

    // Parent objects
    'routines/components/Routine',

    // Dependent views
    'routines/freeFlight/views/Planning',
    'routines/freeFlight/views/Preflight',
    'routines/freeFlight/views/Fly',
    'routines/freeFlight/views/PostRoutine'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    BaseRoutine,
    PlanningView,
    PreflightView,
    FreeFlightFlyView,
    PostRoutineView
) {

    var Routine = BaseRoutine.extend({

        planning: function() {
            var deferred = Q.defer();
            var planningView = new PlanningView({
                model: this.get('mission'),
                deferred: deferred
            }).render();
            return deferred.promise;
        },

        preflight: function() {
            var preflightCompletedDeferred = Q.defer(); // will be resolved when all others are done + user confirms OK
            var parametersUploadedDeferred = Q.defer(); // After custom params loaded onto APM
            var missionUploadedDeferred = Q.defer(); // After waypoints are done loading!

            BaseRoutine.prototype.preflight.apply(this, [preflightCompletedDeferred]); // call parent code

            // Saving this code for a refactoring swamp.  TODO GH#164
            // Upload specific parameters if SITL.
            // We need this ONLY if we're flying SITL.
            // Upload specific parameters if defined in parameters file
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

            // // Upload mission plan
            // KEEPING IN as refactoring swamp for near-term changes to support correct workflow.
            // this.on('change:paramsLoaded', _.bind(function() {

            //     var missionLoaded = _.bind(function() {
            //             $('#loadMission .connecting').hide();
            //             $('#loadMission .connected').show();
            //             this.set( { 'missionLoaded':true });
            //             missionUploadedDeferred.resolve();
            //     }, this);

            //         Q($.get('/drone/mission/load')).then(_.bind(function(data) {
            //             missionLoaded();
            //         }, function(xhr) {
            //             // on failure
            //             console.log(xhr);
            //         }, this));

            //         $('#loadMission .disconnected').hide();
            //         $('#loadMission .connecting').show();

            // }, this));

            return preflightCompletedDeferred.promise;

        },

        // Simple flag so we don't re-render the Fly view once it's been done, which causes the DOM/events to get
        // redrawn and then confused when switching between Mission/Engineering views.
        // Was GH#298.  More complex issues about managing client side application state still exist, though.
        flightInProgress: false,
        fly: function() {
            if (false == this.flightInProgress) {

                try {

                    var flightCompletedDeferred = Q.defer();
                    var platform = this.platform; // to juggle context references

                    // We keep some structures separate from the Backbone-managed attributes because
                    // we don't want to sync or persist them.
                    this.get('mission').platform = this.platform;
                    this.get('mission').connection = this.connection;
                    this.flyView = new FreeFlightFlyView({
                        model: this.get('mission')
                    });
                    this.flyView.deferred = flightCompletedDeferred;
                    this.flyView.render();
                    this.flightInProgress = true;

                    // Hook up platform-based updates.
                    // The socket connection is established in the BaseRoutine/preflight code.
                    this.socket.on('platform', function(platformJson) {
                        try {
                            platform.set(platformJson);
                        } catch (e) {
                            console.log(e);
                        }
                    }, this);

                    this.socket.on('operator:promoted', _.bind(function(operator) {

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

                    this.socket.on('operator:demoted', _.bind(function() {
                        if (false !== this.get('mission').isOperator) {
                            try {
                                this.get('mission').isOperator = false;
                                this.flyView.render();
                            } catch (e) {
                                console.log(e)
                            }
                        }
                    }, this));

                } catch (e) {
                    console.log(e);
                }
            }
            return flightCompletedDeferred.promise;
        },

        postRoutine: function() {

            var deferred = Q.defer();
            this.flightInProgress = false;

            var postRoutineView = new PostRoutineView({
                model: this.get('mission'),
                deferred: deferred
            }).render();
            return deferred.promise;
        },

    });

    return Routine;

});
