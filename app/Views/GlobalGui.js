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

            // for right now, setting the APM severity to have a one-to-one with growl type
            // growl types:
            //      warning, success, danger, error
            var SEVERITY_HIGH = 'danger';
            var SEVERITY_MEDIUM = 'warning';
            var SEVERITY_LOW = 'success';

            // these were pulled from the APM source wherever "gcs_send_text_P" was used to send a STATUSTEXT
            var statustextRegex = {
                "ARMING MOTORS" : {severity: SEVERITY_HIGH},
                "AUTO triggered off" : {severity: SEVERITY_LOW},
                "Arm: Alt disparity" : {severity: SEVERITY_HIGH},
                "Arm: Gyro cal failed" : {severity: SEVERITY_HIGH},
                "Arm: Leaning" : {severity: SEVERITY_HIGH},
                "Arm: Mode not armable" : {severity: SEVERITY_HIGH},
                "Arm: Rotor not spinning" : {severity: SEVERITY_HIGH},
                "Arm: Safety Switch" : {severity: SEVERITY_HIGH},
                "Arm: Thr below FS " : {severity: SEVERITY_HIGH},
                "AutoTune: Failed" : {severity: SEVERITY_HIGH},
                "AutoTune: Started" : false,
                "AutoTune: Stopped" : false,
                "AutoTune: Success" : false,
                "Beginning INS calibration" : false,
                "Calibrating barometer" : false,
                "Crash: Disarming" : {severity: SEVERITY_HIGH},
                "DCM bad heading" : {severity: SEVERITY_HIGH},
                "DISARMING MOTORS" : {severity: SEVERITY_HIGH},
                "Demo Servos" : false,
                "Disable fence failed" : {severity: SEVERITY_HIGH},
                "EKF variance" : {severity: SEVERITY_HIGH},
                "ERASING LOGS" : false,
                "Enable fence failed" : {severity: SEVERITY_HIGH},
                "Erasing logs" : false,
                "Failsafe - Long event on" : {severity: SEVERITY_LOW},
                "Failsafe - Short event off" : {severity: SEVERITY_LOW},
                "Failsafe - Short event on" : {severity: SEVERITY_LOW},
                "Fence disabled" : {severity: SEVERITY_HIGH},
                "Fence enabled" : {severity: SEVERITY_HIGH},
                "GROUND START" : {severity: SEVERITY_LOW},
                "Initialising APM" : false,
                "Log erase complete" : false,
                "Lost GPS" : {severity: SEVERITY_LOW},
                "Low Battery" : {severity: SEVERITY_LOW},
                "NO airspeed" : {severity: SEVERITY_LOW},
                "No GCS heartbeat" : {severity: SEVERITY_HIGH},
                "No dataflash card inserted" : {severity: SEVERITY_LOW},
                "No dataflash inserted" : {severity: SEVERITY_LOW},
                "Parachute: Released" : {severity: SEVERITY_HIGH},
                "Parachute: Too Low" : {severity: SEVERITY_HIGH},
                "PreArm: ACRO_BAL_ROLL/PITCH" : {severity: SEVERITY_HIGH},
                "PreArm: Accels inconsistent " : {severity: SEVERITY_HIGH},
                "PreArm: Accels not healthy" : {severity: SEVERITY_HIGH},
                "PreArm: Alt disparity" : {severity: SEVERITY_HIGH},
                "PreArm: Bad GPS Pos" : {severity: SEVERITY_HIGH},
                "PreArm: Bad Velocity" : {severity: SEVERITY_HIGH},
                "PreArm: Baro not healthy" : {severity: SEVERITY_HIGH},
                "PreArm: Battery failsafe on." : {severity: SEVERITY_HIGH},
                "PreArm: Ch7&Ch8 Opt cannot be same" : {severity: SEVERITY_HIGH},
                "PreArm: Check ANGLE_MAX" : {severity: SEVERITY_HIGH},
                "PreArm: Check Board Voltage" : {severity: SEVERITY_HIGH},
                "PreArm: Check FS_THR_VALUE" : {severity: SEVERITY_HIGH},
                "PreArm: Check mag field" : {severity: SEVERITY_HIGH},
                "PreArm: Compass not calibrated" : {severity: SEVERITY_HIGH},
                "PreArm: Compass not healthy" : {severity: SEVERITY_HIGH},
                "PreArm: Compass offsets too high" : {severity: SEVERITY_HIGH},
                "PreArm: GPS Glitch" : {severity: SEVERITY_HIGH},
                "PreArm: Gyro cal failed" : {severity: SEVERITY_HIGH},
                "PreArm: Gyros inconsistent" : {severity: SEVERITY_HIGH},
                "PreArm: Gyros not healthy" : {severity: SEVERITY_HIGH},
                "PreArm: Hardware Safety Switch" : {severity: SEVERITY_HIGH},
                "PreArm: High GPS HDOP" : {severity: SEVERITY_HIGH},
                "PreArm: INS not calibrated" : {severity: SEVERITY_HIGH},
                "PreArm: Need 3D Fix" : {severity: SEVERITY_HIGH},
                "PreArm: RC not calibrated" : {severity: SEVERITY_HIGH},
                "PreArm: Radio failsafe on." : {severity: SEVERITY_HIGH},
                "PreArm: check fence" : {severity: SEVERITY_HIGH},
                "PreArm: compasses inconsistent" : {severity: SEVERITY_HIGH},
                "Reached home" : {severity: SEVERITY_LOW},
                "Ready to FLY" : {severity: SEVERITY_LOW},
                "Ready to drive" : {severity: SEVERITY_LOW},
                "Ready to track" : {severity: SEVERITY_LOW},
                "Resetting prev_WP" : {severity: SEVERITY_LOW},
                "Throttle armed" : {severity: SEVERITY_HIGH},
                "Throttle disarmed" : {severity: SEVERITY_HIGH},
                "Triggered AUTO with pin" : {severity: SEVERITY_LOW},
                "Trim saved" : false,
                "Waiting for first HIL_STATE message" : false,
                "Warming up ADC" : false,
                "With Delay" : false,
                "WP error" : {severity: SEVERITY_HIGH},
                "barometer calibration complete" : false,
                "flight plan received" : {severity: SEVERITY_LOW},
                "geo-fence OK" : false,
                "geo-fence loaded" : false,
                "geo-fence setup error" : false,
                "geo-fence triggered" : false,
                "init home" : false,
                "verify_conditon: Invalid or no current Condition cmd" : {severity: SEVERITY_HIGH},
                "verify_conditon: Unsupported command" : {severity: SEVERITY_HIGH},
                "verify_nav: Invalid or no current Nav cmd" : {severity: SEVERITY_HIGH},
                "verify_nav: LOITER orbits complete": false,
                "verify_nav: LOITER time complete" : false,
                "zero airspeed calibrated" : {severity: SEVERITY_LOW}
            };

            app.socket.on('STATUSTEXT', function(statustext) {
                var growlType = _.find(statustextRegex, function(el, index) {
                    var re = new RegExp(index);
                    return re.test(statustext);
                });

                if('undefined' === typeof growlType) {
                    app.growl(statustext, 'error');
                } else if ('object' === typeof growlType) {
                    app.growl(statustext, growlType.severity);
                } else if (false === growlType) {
                    // don't send a growl
                } else {
                    // wat
                    console.error('unexpected type of growl in GlobalGui.js: ' + typeof growlType + ' ' + growlType);
                }

            });
        }

    });

    return GlobalGuiView;

});
