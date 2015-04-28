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
    'routines/freeFlight/views/Postflight'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    BaseRoutine,
    PlanningView,
    PreflightView,
    FreeFlightFlyView,
    PostflightView
) {

    var Routine = BaseRoutine.extend({

        initialize: function() {
            BaseRoutine.prototype.initialize.apply(this);

            // Assign views that will be invoked by the base class here.
            this.PreflightView = PreflightView;
        },

        planning: function() {
            var deferred = Q.defer();
            var planningView = new PlanningView({
                model: this.get('mission'),
                deferred: deferred
            }).render();
            return deferred.promise;
        },

        fly: function() {
            if (false == this.flightInProgress) {

                try {

                    var flightCompletedDeferred = Q.defer();

                    // We keep some structures separate from the Backbone-managed attributes because
                    // we don't want to sync or persist them.
                    this.get('mission').setPlatform(this.platform);
                    console.log("setting this.mission.platform in Freeflight/Routine.js");
                    console.log(this.platform);
                    this.get('mission').connection = this.connection;
                    this.flyView = new FreeFlightFlyView({
                        model: this.get('mission')
                    });
                    this.flyView.deferred = flightCompletedDeferred;
                    this.flyView.render();
                    this.flightInProgress = true;
                    this.bindServerClientSocketEvents(); // in parent code

                } catch (e) {
                    console.log(e);
                }
            }
            return flightCompletedDeferred.promise;
        },

        postflight: function() {

            var deferred = Q.defer();
            this.flightInProgress = false;

            var postflightView = new PostflightView({
                model: this.get('mission'),
                deferred: deferred
            }).render();
            return deferred.promise;
        },

    });

    return Routine;

});
