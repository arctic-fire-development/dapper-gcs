define(['backbone', 'JST'], function(Backbone, templates) {

    var ConnectionWidget = Backbone.View.extend({

        template: templates['app/Templates/connectionWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');

            this.model.on('change:status', this.render, this);
            this.model.on('change:time_since_last_heartbeat', this.render, this);
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

                this.$el.find('.connected').hide();
                this.$el.find('.connecting').hide();

                hasRendered = true;
            }

            // Rerender upon events.
            switch (this.model.get('status')) {
                case 'disconnected':
                    this.$el.find('.connected').hide();
                    this.$el.find('.connecting').hide();
                    this.$el.find('.disconnected').show();
                    break;

                case 'connecting':
                    this.$el.find('.connected').hide();
                    this.$el.find('.connecting').show();
                    this.$el.find('.disconnected').hide();
                    break;

                case 'connected':
                    this.$el.find('.connected').show();
                    this.$el.find('.connecting').hide();
                    this.$el.find('.disconnected').hide();
                    break;
            }
        }
    });

    return ConnectionWidget;

});