'use strict';
/*global define */
define([

    // Application + dependencies
    'app',
    'underscore',
    'backbone',
    'jquery',
    'require',
    'routefilter',
    'bootstrap-growl',

    'routines/freeFlight/Routine',

    // Models
    'Models/Mission',
    'Models/Platform',

    // Dependent views
    'Views/Home',
    'Views/Plan',
    'Views/Engineering'
], function(app, _, Backbone, $, require, rf, BG,
    
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
            'mission/current' : 'resumeCurrentMissionStep'
        },

        initialize: function() {

            _.bindAll(this, 'handleOperatorPromotion', 'handleOperatorDemotion', 'handleRoutineStarted', 'handleRoutineEnded');

            this.socket = app.socket;

            this.mission = new Mission({}, { socket: this.socket });
            this.mission.fetch();

            var Routine = require(this.getRoutineName());
            this.routine = new Routine({
                mission: this.mission
            });

            this.homeView = new HomeView({
                model: this.mission,
                socket: app.socket
            });

            this.planView = new PlanView({
                model: this.mission
            });

            // TODO GH#xxx refactor to more sensible place...?
            this.socket.on('operator:promoted', this.handleOperatorPromotion);
            this.socket.on('operator:demoted', this.handleOperatorDemotion);
            this.socket.on('routine:started', this.handleRoutineStarted);
            this.socket.on('routine:ended', this.handleRoutineEnded);

        },

        handleRoutineStarted: function() {
            if( true !== this.mission.isOperator ) {
                this.homeView.renderRoutineStartedModalOverride();
            }
        },

        handleRoutineEnded: function() {

        },

        handleOperatorPromotion: function() {
            // Only deal if this is a change.
            if(false === this.mission.isOperator)  {
                this.mission.isOperator = true;
                $('#indicators li.isOperator').show();
                $('#indicators li.isObserver').hide();
                app.growl("<span class='glyphicon glyphicon-cloud-upload'></span> You've been promoted to operator for this mission.", "success", 10000);
            }
        },

        handleOperatorDemotion: function() {
            // Only squawk if this is a change.
            if(true === this.mission.isOperator) {
                this.mission.isOperator = false;
                app.growl("<span class='glyphicon glyphicon-eye-open'></span> Another user is now the active operator.", "warning", 10000);
                $('#indicators.isOperator').hide();
                $('#indicators.isObserver').show();
            }
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
            if('not started' !== this.mission.get('status')) {
                this.navigate('mission/'+this.mission.get('status'), { trigger: true });
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
            this.showOnly('planning');
            this.routine.planning().then(_.bind(function() {
                this.navigate('mission/preflight', { trigger: true });
            }, this));
        },

        preflight: function() {
            // Preflight is when we need to lock down operator vs. observers.
            // Let's try doing this via non-ack'd realtime requests and see how the approach works.
            this.socket.emit('operator:promote:force', {
                id: this.socket.id,
            });

            // Alert all clients that a routine is about to be underway.
            this.socket.emit('routine:started');

            this.showOnly('preflight');
            this.mission.set({status:'preflight'});
            this.routine.preflight().then(_.bind(function() {
                this.navigate('mission/fly', { trigger: true });
            }, this));
        },

        fly: function() {
            this.showOnly('fly');
            // TODO this can't be right/here, otherwise any observer will also trigger this action.
            this.mission.set({status:'fly', active: true});
            this.routine.fly();
        },

        mission: function() {
            this.showOnly('mission');
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