define(['backbone', 'JST'], function(Backbone, template) {

    var HealthWidget = Backbone.View.extend({

        el: '#healthWidget',
        template: template['app/Templates/healthWidget'],
        className: 'widget',

        initialize: function() {

            _.bindAll(this);
            this.model.on('change:mode', this.render);
            this.model.on('change:armed', this.render);
            this.model.on('change:manual', this.render);
            this.model.on('change:stabilize', this.render);
            this.model.on('change:auto', this.render);
            this.model.on('change:guided', this.render);
        },

        render: function() {

            this.$el.html(this.template({
                stateMode: this.model.get('mode')
            }));

            if (true === this.model.get('armed')) {
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