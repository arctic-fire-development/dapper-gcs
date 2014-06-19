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
    "routines/freeFlight/views/Planning",
    "routines/freeFlight/views/Preflight",
    "routines/freeFlight/views/Fly"

], function(app, now, _, $, Q, Backbone,
    Mission,
    Platform,
    Connection,
    PlanningView,
    PreflightView,
    SitlFlyView
) {

    var Routine = Backbone.Model.extend({

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
            var planningView = new PlanningView({
                deferred: deferred,
                mission: this.get('mission')
            }).render();
            return deferred.promise;
        },

    preflight: function(preflightCompletedDeferred) {

        // A few promises for keeping track of various async processes.
        var connectionEstablishedDeferred = Q.defer(); // After connection is confirmed with UAV

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

        

        // And done!
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

    return Routine;

});