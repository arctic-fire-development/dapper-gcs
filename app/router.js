define([

    // Application + dependencies
    "app",
    "now",
    "underscore",
    "jquery",

    // Models
    "Models/Mission",
    "Models/Platform",
    "Models/Connection",

    // Dependent views
    "Views/Mission",
    "Views/Home",
    "Views/Plan"
], function(app, now, _, $,
    Mission,
    Platform,
    Connection,
    MissionView,
    HomeView,
    PlanView) {

    // Defining the application router, you can attach sub routers here.
    var Router = Backbone.Router.extend({

        routes: {
            "": "home",
            "plan" : "plan",
            "mission" : "mission"
        },

        initialize: function() {
            this.homeView = new HomeView();
            this.planView = new PlanView();
        },

        // Pass the name of the div to show, others are hidden for "navigation" :)
        showOnly: function(name) {
            var panes = ['home', 'plan', 'mission'];
            _.each( _.reject(panes, function(div){ return div === name; }) , function(e){ $('#' + e).hide(); });
            $('#'+name).show();
        },

        home: function() {
            this.showOnly('home');
            this.homeView.render();
        },

        plan: function() {
            this.showOnly('plan');
            this.planView.render();
        },

        mission: function() {

            this.showOnly('mission');
            var platform = this.platform = new Platform();
            var connection = this.connection = new Connection();

            this.mission = new Mission({
                platform: this.platform,
                connection: this.connection
            });

            this.missionView = new MissionView({
                model: this.mission
            });

            // Assign locally for calling once the Now connection is ready
            var missionView = this.missionView;

            // Handle message events as they are provided from the server
            // This won't scale =P
            now.ready(function() {

                missionView.render();

                now.updatePlatform = function(platformJson) {
                    platform.set(platformJson);
                };

                now.updateConnection = function(connectionJson) {
                    connection.set(connectionJson);
                };

            });

        }

    });

    return Router;

});