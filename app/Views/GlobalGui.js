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
            var statustextRegex = {
                '^Initialising' : false, // one we would not display
                '^PREARM' : { severity: 'warning'} // one we would display
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
                } else if ('false' === typeof growlTypel) {
                    // don't do anything
                } else {
                    // wat
                    console.error('unexpected type of growl in GlobalGui.js')
                }

            });
        }

    });

    return GlobalGuiView;

});
