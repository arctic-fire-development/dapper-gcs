define([

    // Application + dependencies
    "app",
    "now",
    "underscore",
    "jquery",
    "q",
    "backbone",

    // Models
    "Models/Mission",
    "Models/Platform",
    "Models/Connection",

    // Parent objects
    "routines/components/Routine",

    // Dependent views
    "routines/freeFlight/views/Planning",
    "routines/freeFlight/views/Preflight",
    "routines/freeFlight/views/Fly"

], function(app, now, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    BaseRoutine,
    PlanningView,
    PreflightView,
    FreeFlightFlyView
) {

    var Routine = BaseRoutine.extend({

        preflight: function() {
            var preflightCompletedDeferred = Q.defer(); // will be resolved when all others are done + user confirms OK
            var parametersUploadedDeferred = Q.defer(); // After custom params loaded onto APM
            var missionUploadedDeferred = Q.defer(); // After waypoints are done loading!

            BaseRoutine.prototype.preflight.apply(this, [preflightCompletedDeferred]); // call parent code

            // Upload specific parameters
            this.on('change:connected', _.bind(function(model) {

                var parametersLoaded = _.bind(function() {
                        this.set( { 'paramsLoaded':true });
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


        // Upload mission plan
        this.on('change:paramsLoaded', _.bind(function() {

            var missionLoaded = _.bind(function() {
                    $('#loadMission .connecting').hide();
                    $('#loadMission .connected').show();
                    this.set( { 'missionLoaded':true });
                    missionUploadedDeferred.resolve();
            }, this);

                Q($.get('/drone/mission/load')).then(_.bind(function(data) {
                    missionLoaded();
                }, function(xhr) {
                    // on failure
                    console.log(xhr);
                }, this));
                
                $('#loadMission .disconnected').hide();
                $('#loadMission .connecting').show();
            
        }, this));

            return preflightCompletedDeferred.promise;

        },

        fly: function() {
            var flightCompletedDeferred = Q.defer();
            var platform = this.platform; // to juggle context references
            var mission = new Mission({
                platform: this.platform,
                connection: this.connection
            });

            var flyView = new FreeFlightFlyView({
                model: mission
            });

            // Handle message events as they are provided from the server
            // This won't scale =P
            now.ready(function() {
                flyView.render();
                now.updatePlatform = function(platformJson) {
                   platform.set(platformJson);
               };
            });

            //return flightCompletedDeferred.promise;
        }

    });

    return Routine;

});