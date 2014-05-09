define([

    // Application + dependencies
    "app",
    "now",
    "underscore",
    "jquery",
    "require",

    "routines/sitl/RoutineSitl",

    // Models
    "Models/Mission",
    "Models/Platform",
    "Models/Connection",

    // Dependent views
    "Views/Mission",
    "Views/Home",
    "Views/Plan"
], function(app, now, _, $, require,
    RoutineSitl,
    Mission,
    Platform,
    Connection,
    MissionView,
    HomeView,
    PlanView) {

    var Router = Backbone.Router.extend({

        routes: {
            "": "home",
            "plan" : "plan",
            "mission" : "mission",
            "mission/planning" : "planning",
            "mission/preflight" : "preflight",
            "mission/fly" : "fly"
        },

        initialize: function() {
            this.homeView = new HomeView();
            this.planView = new PlanView();
        },

        // Pass the name of the div to show, others are hidden for "navigation" :)
        showOnly: function(name) {
            var panes = ['home', 'plan', 'mission', 'preflight', 'planning', 'fly'];
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

        planning: function() {
            this.showOnly('planning');
            this.mission.planning().then(_.bind(function() {
                this.navigate('mission/preflight', { trigger: true });
            }, this));
        },

        preflight: function() {
            this.showOnly('preflight');
            this.mission.preflight().then(_.bind(function() {
                this.navigate('mission/fly', { trigger: true });
            }, this));
        },

        fly: function() {
            this.showOnly('fly');
            this.mission.fly();
            /*.then(_.bind(function() {
                this.navigate('mission/postflight', { trigger: true });
            }, this));*/
        },

        mission: function() {
            this.showOnly('mission');
            this.mission = new RoutineSitl();
            this.navigate('mission/planning', { trigger: true });
        }

    });

    return Router;

});