define(['backbone', 'JST', 'now'], function(Backbone, template, now) {

    var CommsWidget = Backbone.View.extend({

        el: '#commsWidget',
        template: template['app/Templates/commsWidget'],
        className: 'widget',
        events: {
            'click #loadParams': 'loadParameters',
            'click #loadMission': 'loadMission',
            'click #startMission': 'startMission'
        },

        initialize: function() {
            this.model.on('change:status', this.render, this);
            this.model.on('change:time_since_last_heartbeat', this.render, this);
        },

        loadParameters: function() {
            now.ready(function() {
                now.loadParams('Loading params...');
            });
        },

        loadMission: function() {
            now.ready(function() {
                now.loadMission('Loading mission...');
            });
        },

        startMission: function() {
            now.ready(function() {
                now.startMission('Starting mission...');
            });
        },

        render: function() {
            var hasRendered;

            // Only draw this on initial page render.
            if (true !== hasRendered) {

                var heartbeatMessage = '';
                if (this.model.get('time_since_last_heartbeat') > 5000) {
                    heartbeatMessage = ', disconnected for ' + this.model.get('time_since_last_heartbeat') + ' s';
                }

                this.$el.html(this.template({
                    time_since_last_heartbeat: heartbeatMessage,
                    drop_rate_comm: this.model.get('drop_rate_comm'),
                    errors_comm: this.model.get('errors_comm')
                }));

                $('.connected').hide();
                $('.connecting').hide();

                hasRendered = true;
            }

            // Rerender upon events.
            switch (this.model.get('status')) {
                case 'disconnected':
                    $('#comms .connected').hide();
                    $('#comms .connecting').hide();
                    $('#comms .disconnected').show();
                    break;

                case 'connecting':
                    $('#comms .connected').hide();
                    $('#comms .connecting').show();
                    $('#comms .disconnected').hide();
                    break;

                case 'connected':
                    $('#comms .connected').show();
                    $('#comms .connecting').hide();
                    $('#comms .disconnected').hide();
                    break;
            }

        }

    });

    return CommsWidget;

});