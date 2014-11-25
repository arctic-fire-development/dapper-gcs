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
    'routines/components/Models/Path',

    // Dependent views
    'routines/paths/views/Planning',
    'routines/paths/views/Preflight',
    'routines/paths/views/Fly',
    'routines/paths/views/Postflight'

], function(app, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    BaseRoutine,
    Path,
    PlanningView,
    PreflightView,
    FlyView,
    PostflightView
) {

    var Routine = BaseRoutine.extend({

        initialize: function() {
            this.set('path', new Path());
            BaseRoutine.prototype.initialize.apply(this);
            console.log(this);
            // Assign views that will be invoked by the base class here.
            this.PreflightView = PreflightView;
        },

        planning: function() {
            var deferred = Q.defer();
            var planningView = new PlanningView({
                model: this.get('mission'),
                deferred: deferred,
                path: this.get('path')
            }).render();
            return deferred.promise;
        },

        fly: function() {
            if (false == this.flightInProgress) {

                try {

                    var flightCompletedDeferred = Q.defer();
                    var platform = this.platform; // to juggle context references

                    // We keep some structures separate from the Backbone-managed attributes because
                    // we don't want to sync or persist them.
                    this.get('mission').platform = this.platform;
                    this.get('mission').connection = this.connection;
                    this.flyView = new FlyView({
                        model: this.get('mission')
                    });
                    this.flyView.path = this.get('path');
                    this.flyView.deferred = flightCompletedDeferred;
                    this.flyView.render();
                    this.bindServerClientSocketEvents(); // in parent code

                    this.flightInProgress = true;

                } catch (e) {
                    console.log(e);
                    console.log(e.stack);
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
