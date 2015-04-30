define(['backbone', 'JST', 'q', 'bootstrap', 'app'], function(Backbone, templates, Q, BS, app) {

    var GlobalGuiView = Backbone.View.extend({

        el: '#global',
        template: templates['app/Templates/GlobalGui'],
        events: {
            'click #gotoFly': 'gotoFly',
            'click #gotoHome': 'gotoHome'
        },
        render: function() {
            this.$el.html(this.template);
            this.bindGrowlNotifications();
            return this;
        },

        renderRoutineStartedModalOverride: function() {
            $('#routineStartedModalOverride').modal({
                backdrop: 'static', // forbid dismiss by click
                keyboard: false // forbid dismiss by escape
            });
        },

        renderRoutineEndedModalOverride: function() {
            $('#routineEndedModalOverride').modal({
                backdrop: 'static', // forbid dismiss by click
                keyboard: false // forbid dismiss by escape
            });
        },

        renderLostServerConnection: function() {
            $('#lostServerConnection').modal({
                backdrop: 'static', // forbid dismiss by click
                keyboard: false // forbid dismiss by escape
            });
        },

        gotoFly: function() {
            app.router.navigate('mission/fly', {
                trigger: true
            });
        },

        gotoHome: function() {
            app.router.navigate('', {
                trigger: true
            });
        },

        bindGrowlNotifications: function() {
            app.socket.on('launching', function() {
                app.growl('Launching');
            });

            // sketch of approach
            // growl types:
            //      warning, success, danger, error
            var statustextRegex = {
                '^Initialising' : false, // one we would not display
                '^PREARM' : false,
                '^PreArm' : false,
                '^Throttle' : {severity: 'warning'},
                '^Erasing' : { severity: 'warning'},
                '^Log\ erase\ complete': {severity: 'success'},
                '^AutoTune': {severity: 'warning'},
                '^Crash': {severity: 'danger'},
                '^Parachute' : {severity: 'warning'},
                '^EKF variance': {severity: 'danger'},
                '^DCM bad heading': {severity: 'danger'},
                '^Low battery': {severity: 'danger'},
                '^Lost GPS': {severity: 'danger'},
                '^ARMING': {severity : 'warning'},
                '^Arm': {severity: 'danger'},
                '^DISARMING': {severity: 'warning'},
                '^Calibrating': false,
                '^barometer calibration': false,
                '^trim saved': false,
                '^No dataflash inserted': false,
                '^ERASING LOGS': {severity: 'warning'},
                '^Waiting for first HIL_STATE message': false,
                '^GROUND START': {severity: 'success'}
            };

            app.socket.on('STATUSTEXT', function(statustext) {
                console.info("STATUSTEXT: " + statustext); // so we can find all these
                // consider just turning these bad boys off to start with???
                // no, because they often convey "FAILED TO ARM BECAUSE REASON".
                var growlType = _.find(statustextRegex, function(el, index) {
                    var re = new RegExp(index);
                    return re.test(statustext);
                });
                if('undefined' === typeof growlType) {
                    app.growl(statustext, 'error');
                } else if ('object' === typeof growlType) {
                    app.growl(statustext, growlType.severity);
                } else if ('false' === typeof growlType) {
                    // don't do anything
                } else {
                    // wat
                    console.error('unexpected type of growl in GlobalGui.js: ' + typeof growlType + ' ' + growlType);
                }

            });
        }

    });

    return GlobalGuiView;

});
