define([

    // Application + dependencies
    "app",
    "now",
    "underscore",
    "jquery",
    "require",

    "routines/freeFlight/Routine",

    // Models
    "Models/Mission",
    "Models/Platform",
    "Models/Connection",

    // Dependent views
    "Views/Home",
    "Views/Plan"
], function(app, now, _, $, require,
    
    RoutineFreeFlight,

    Mission,
    Platform,
    Connection,
    
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
            this.mission = new Mission();

            this.planView = new PlanView({
                model: this.mission
            });
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
            this.routine.planning().then(_.bind(function() {
                this.navigate('mission/preflight', { trigger: true });
            }, this));
        },

        preflight: function() {
            this.showOnly('preflight');
            this.routine.preflight().then(_.bind(function() {
                this.navigate('mission/fly', { trigger: true });
            }, this));
        },

        fly: function() {
            this.showOnly('fly');
            this.routine.fly();
            /*.then(_.bind(function() {
                this.navigate('mission/postflight', { trigger: true });
            }, this));*/
        },

        mission: function() {
            this.showOnly('mission');
            var routine = require(this.getRoutineName());
            this.routine = new routine().set({
                mission: this.mission
            });
            this.navigate('mission/planning', { trigger: true });
        },

        // TODO GH#96
        getRoutineName: function() {

            // Pending real plugin architecture, hardcode to free flight mode.
            return routineName = 'routines/freeFlight/Routine';
            
        }

    });

    return Router;

});