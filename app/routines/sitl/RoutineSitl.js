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

    // Dependent views
    "routines/sitl/views/Planning",
    "routines/sitl/views/Preflight",
    "routines/sitl/views/Fly"

], function(app, now, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    PlanningView,
    PreflightView,
    SitlFlyView
) {

    var RoutineSitl = Backbone.Model.extend({

        defaults: {
            'connected': false,
            'paramsLoaded': false,
            'missionLoaded': false
        },

        initialize: function() {
            _.bindAll(this, 'planning', 'preflight', 'fly');
            this.connection = new Connection();
            this.platform = new Platform();
            this.connection.on('change:status', _.bind(function(model) {
                if(model.get('status') === 'connected') {
                    this.set({ 'connected' : true});
                }
            }, this));
        },

        planning: function() {
            var deferred = Q.defer();
            var planningView = new PlanningView( { deferred: deferred }).render();
            return deferred.promise;
        },

    preflight: function() {

        // A few promises for keeping track of various async processes.
        var preflightCompletedDeferred = Q.defer(); // will be resolved when all others are done + user confirms OK
        var connectionEstablishedDeferred = Q.defer(); // After connection is confirmed with UAV
        var parametersUploadedDeferred = Q.defer(); // After custom params loaded onto APM
        var missionUploadedDeferred = Q.defer(); // After waypoints are done loading!

/*
        var allLoaded = Q.allSettled([
            connectionEstablishedDeferred,
            parametersUploadedDeferred,
            missionUploadedDeferred
        ]).then(function() {
            preflightCompletedDeferred.resolve();
        });
*/

        var preflightView = new PreflightView( {
            deferred: preflightCompletedDeferred,
            model: this.connection
        }).render();
        
        // Initalize connection.
        now.ready(_.bind(function() {

            // Hook up GUI to connection states.
            now.updateConnection = _.bind(function(connectionJson) {
                this.connection.set(connectionJson);
            }, this);

            // Start connection.
            now.startConnection(true);

        }, this));

        // Upload specific parameters
        this.on('change:connected', _.bind(function(model) {

            var parametersLoaded = _.bind(function() {
                    this.set( { 'paramsLoaded':true });
                    parametersUploadedDeferred.resolve();
                    $('#loadParameters .connecting').hide();
                    $('#loadParameters .connected').show();
            }, this);

                Q($.get('/plugins/sitl/params/load')).then(_.bind(function(data) {
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

                Q($.get('/plugins/sitl/mission/load')).then(_.bind(function(data) {
                    missionLoaded();
                }, function(xhr) {
                    // on failure
                    console.log(xhr);
                }, this));
                
                $('#loadMission .disconnected').hide();
                $('#loadMission .connecting').show();
            
        }, this));

        // And done!
        return preflightCompletedDeferred.promise;
    },

    fly: function() {
        var flightCompletedDeferred = Q.defer();
        var platform = this.platform; // to juggle context references
        var mission = new Mission({
            platform: this.platform,
            connection: this.connection
        });

        var flyView = new SitlFlyView({
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
        
    },

    postflight: function() {
        alert('postflight');
        return true;
    }
    });
  

    return RoutineSitl;

});