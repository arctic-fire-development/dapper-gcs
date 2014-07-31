'use strict';
/*global define */
define([

    // Application + dependencies
    'app',
    'io',
    'underscore',
    'backbone',
    'jquery',
    'require',
    'routefilter',

    'routines/freeFlight/Routine',

    // Models
    'Models/Mission',
    'Models/Platform',

    // Dependent views
    'Views/Home',
    'Views/Plan',
    'Views/Engineering'
], function(app, io, _, Backbone, $, require, rf,
    
    RoutineFreeFlight,

    Mission,
    Platform,
    
    HomeView,
    PlanView,
    EngineeringView

    ) {

    var Router = Backbone.Router.extend({

        routes: {
            '': 'home',
            'plan' : 'plan',
            'mission' : 'mission',
            'mission/planning' : 'planning',
            'mission/preflight' : 'preflight',
            'mission/fly' : 'fly',
            'engineering' : 'engineering',
            'resumeCurrentMissionStep' : 'resumeCurrentMissionStep'
        },
        currentMission: undefined,

        initialize: function() {

            this.homeView = new HomeView();
            this.mission = new Mission();

            this.planView = new PlanView({
                model: this.mission
            });
        },

        // Works for 2 menu items!  Hacky!  =)
        before: function(route) {
            var menu = (route == 'engineering') ? 'engineering' : 'mission';
            this.setActiveMenu(menu);
        },

        // Pass the name of the div to show, others are hidden for 'navigation' :)
        showOnly: function(name) {
            var panes = ['home', 'plan', 'mission', 'preflight', 'planning', 'fly', 'engineering'];
            _.each( _.reject(panes, function(div){ return div === name; }) , function(e){ $('#' + e).hide(); });
            $('#'+name).show();
        },
        // Set the active top-level bootstrap item.
        setActiveMenu: function(menu) {
            $('#navbar ul.navbar-nav li').each(function() {
                (menu == $(this).data('name')) ? $(this).addClass('active') : $(this).removeClass('active');
            });
        },

        resumeCurrentMissionStep: function() {
            if(this.currentMission) {
                this.navigate('mission/'+this.currentMission, { trigger: true });
            } else {
                this.navigate('plan', { trigger: true });
            }
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
            this.currentMission = 'planning';
            this.showOnly('planning');
            this.routine.planning().then(_.bind(function() {
                this.navigate('mission/preflight', { trigger: true });
            }, this));
        },

        preflight: function() {
            this.currentMission = 'preflight';
            this.showOnly('preflight');
            this.routine.preflight().then(_.bind(function() {
                this.navigate('mission/fly', { trigger: true });
            }, this));
        },

        fly: function() {
            this.currentMission = 'fly';
            this.showOnly('fly');
            this.routine.fly();
        },

        mission: function() {
            this.showOnly('mission');
            var routine = require(this.getRoutineName());
            this.routine = new routine().set({
                mission: this.mission
            });
            this.navigate('mission/planning', { trigger: true });
        },

        engineering: function() {
            this.showOnly('engineering');
            this.engineeringView = new EngineeringView({
                model: new Platform()
            }).render();
        },

        // TODO GH#96
        getRoutineName: function() {

            // Pending real plugin architecture, hardcode to free flight mode.
            return routineName = 'routines/freeFlight/Routine';
            
        }

    });

    return Router;

});