define(['backbone', 'JST'], function(Backbone, templates) {

    var HealthWidget = Backbone.View.extend({

        el: '#healthWidget',
        template: templates['app/Templates/healthWidget'],
        className: 'widget',

        initialize: function() {

            _.bindAll(this, 'render');
            this.model.on('change:stateMode', this.render);
            this.model.on('change:stateArmed', this.render);
            this.model.on('change:stateManual', this.render);
            this.model.on('change:stateStabilize', this.render);
            this.model.on('change:stateAuto', this.render);
            this.model.on('change:stateGuided', this.render);
        },

        render: function() {

            this.$el.html(this.template({
                stateMode: this.model.get('stateMode')
            }));

            if (true === this.model.get('stateArmed')) {
                this.$el.find('.flightModeArmed').show();
                this.$el.find('.flightModeDisarmed').hide();
            } else {
                this.$el.find('.flightModeArmed').hide();
                this.$el.find('.flightModeDisarmed').show();
            }
        }

    });
    return HealthWidget;

});