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
    'Models/Connection',

    // Dependent views
    'Views/GlobalGui',
    'Views/Home',
    'Views/Select',
    'Views/Engineering'
], function(app, _, Backbone, $, require, rf, BG,

    RoutineFreeFlight,

    Mission,
    Platform,
    Connection,

    GlobalGuiView,
    HomeView,
    SelectView,
    EngineeringView

) {

    var Router = Backbone.Router.extend({

        routes: {
            '': 'home',
            'select': 'select',
            'mission': 'mission',
            'mission/planning': 'planning',
            'mission/preflight': 'preflight',
            'mission/fly': 'fly',
            'mission/postflight': 'postflight',
            'engineering': 'engineering',
            'mission/current': 'resumeCurrentMissionStep'
        },

        initialize: function() {

            _.bindAll(this, 'handleOperatorPromotion', 'handleOperatorDemotion', 'handleRoutineStarted', 'handleRoutineEnded');

            this.socket = app.socket;

            this.mission = new Mission({}, {
                socket: this.socket
            });
            this.mission.fetch();

            var Routine = require(this.getRoutineName());
            this.routine = new Routine({
                mission: this.mission
            });

            this.globalGuiView = new GlobalGuiView().render();

            this.homeView = new HomeView({
                model: this.mission,
                socket: app.socket
            });

            this.selectView = new SelectView({
                model: this.mission
            });

            // Hook some events up on the main wizard sequence
            $('#flightWizard').wizard();

            // TODO GH#xxx refactor to more sensible place...?
            this.socket.on('operator:promoted', this.handleOperatorPromotion);
            this.socket.on('operator:demoted', this.handleOperatorDemotion);
            this.socket.on('routine:started', this.handleRoutineStarted);
            this.socket.on('routine:ended', this.handleRoutineEnded);
            this.socket.on('disconnect', this.globalGuiView.renderLostServerConnection);

            // Just reload the screen when we're reconnected.  Not perfect, but a start.
            this.socket.on('reconnect', function() {
                document.location.reload(true);
            });

        },

        handleRoutineStarted: function() {
            if (true !== this.mission.isOperator) {
                this.globalGuiView.renderRoutineStartedModalOverride();
            }
        },

        handleRoutineEnded: function() {
            if (true !== this.mission.isOperator) {
                this.globalGuiView.renderRoutineEndedModalOverride();
            }
        },

        handleOperatorPromotion: function() {
            // Only deal if this is a change.
            if (false === this.mission.isOperator) {
                this.mission.isOperator = true;
                $('#indicators li.isOperator').show();
                $('#indicators li.isObserver').hide();
                app.growl("<span class='glyphicon glyphicon-cloud-upload'></span> You've been promoted to operator for this mission.", "success", 10000);
            }
        },

        handleOperatorDemotion: function() {
            // Only squawk if this is a change.
            if (true === this.mission.isOperator) {
                this.mission.isOperator = false;
                $('#indicators li.isOperator').hide();
                $('#indicators li.isObserver').show();
                app.growl("<span class='glyphicon glyphicon-eye-open'></span> Another user is now the active operator.", "warning", 10000);
            }
        },

        // Works for 2 menu items!  Hacky!  =)
        before: function(route) {
            var menu = (route == 'engineering') ? 'engineering' : 'mission';
            this.setActiveMenu(menu);
        },

        // Pass the name of the div to show, others are hidden for 'navigation' :)
        showOnly: function(name) {
            var panes = ['home', 'flightWizard', 'fly', 'engineering'];
            _.each(_.reject(panes, function(div) {
                return div === name;
            }), function(e) {
                $('#' + e).hide();
            });
            $('#' + name).show();
        },

        // Set the active top-level bootstrap item.
        setActiveMenu: function(menu) {
            $('#navbar ul.navbar-nav li').each(function() {
                (menu == $(this).data('name')) ? $(this).addClass('active'): $(this).removeClass('active');
            });
        },

        resumeCurrentMissionStep: function() {
            if ('not started' !== this.mission.get('status')) {
                this.navigate('mission/' + this.mission.get('status'), {
                    trigger: true
                });
            } else {
                this.navigate('plan', {
                    trigger: true
                });
            }
        },

        home: function() {
            this.showOnly('home');
            this.homeView.render();
        },

        select: function() {
            this.showOnly('flightWizard');

            // Prepare the wizard!  Maybe should be moved to its own view at some point?
            $('#flightWizard').wizard('selectedItem', {
                step: 1
            });

            this.selectView.render();
        },

        planning: function() {

            this.showOnly('flightWizard');
            $('#flightWizard').wizard('selectedItem', {
                step: 2
            });

            this.routine.planning().then(_.bind(function() {
                this.navigate('mission/preflight', {
                    trigger: true
                });
            }, this));
        },

        preflight: function() {
            // Preflight is when we need to lock down operator vs. observers.
            // Let's try doing this via non-ack'd realtime requests and see how the approach works.
            this.socket.emit('operator:promote:force');

            // Alert all clients that a routine is about to be underway.
            this.socket.emit('routine:started');

            this.showOnly('flightWizard');
            $('#flightWizard').wizard('selectedItem', {
                step: 3
            });

            this.mission.set({
                status: 'preflight'
            });
            this.routine.preflight().then(_.bind(function() {
                this.navigate('mission/fly', {
                    trigger: true
                });
            }, this));
        },

        fly: function() {
            this.showOnly('fly');
            // TODO this can't be right/here, otherwise any observer will also trigger this action.
            // GH#289
            this.mission.set({
                status: 'fly',
                active: true
            });
            this.routine.fly().then(_.bind(function() {
                this.navigate('mission/postflight', {
                    trigger: true
                });
            }, this));
        },

        postflight: function() {
            // Alert all clients that a routine is about to end.
            this.socket.emit('routine:ended');

            this.showOnly('flightWizard');
            $('#flightWizard').wizard('selectedItem', {
                step: 5
            });
            this.mission.set({
                status: 'postflight',
                active: false
            });
            this.routine.postflight().then(_.bind(function() {
                this.navigate('', {
                    trigger: true
                });
            }, this));
        },

        // TODO GH#290 This handles the menu item, so it needs to dispatch you to the current state (flight, planning, etc).
        // Well... maybe not.  This gets called when, for example, user clicks on Continue button during Select phase.
        // Not sure if this is just some bit rot or what...?
        mission: function() {
            this.showOnly('flightWizard');
            this.navigate('mission/planning', {
                trigger: true
            });
        },

        // Simple flag to prevent re-rendering Engineering view.  Was GH#291.
        hasRenderedEngineering: false,
        engineering: function() {
            this.showOnly('engineering');
            if (false === this.hasRenderedEngineering) {
                this.engineeringView = new EngineeringView({
                    model: new Platform()
                }).render();

                this.hasRenderedEngineering = true;
            }
        },

        // TODO GH#96
        getRoutineName: function() {

            // Pending real plugin architecture, hardcode to free flight mode.
            return routineName = 'routines/freeFlight/Routine';

        }

    });

    return Router;

});
