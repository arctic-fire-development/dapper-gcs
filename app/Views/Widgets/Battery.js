define(['backbone', 'JST'], function(Backbone, template) {

    var BatteryWidget = Backbone.View.extend({

        el: '#batteryWidget',
        template: template['app/Templates/batteryWidget'],
        className: 'widget',

        initialize: function() {
            this.listenTo(this.model, 'change:current_battery', this.render);
            this.listenTo(this.model, 'change:voltge_battery', this.render);
            this.listenTo(this.model, 'change:battery_remaining', this.render);
        },

        render: function() {
            this.$el.html(this.template({
                icon: this.getIcon(),
                battery_remaining: this.model.get('battery_remaining'),
                voltage_battery: this.model.get('voltage_battery') / 1000,
                current_battery: this.model.get('current_battery') / -100
            }));
        },

        getIcon: function() {
            if (!this.model.get('battery_remaining')) {
                return "images/battery-empty.svg";
            } else {
                var battery_remaining = this.model.get('battery_remaining');
                if (battery_remaining >= 90) {
                    return "images/battery-green.svg";
                } else if (battery_remaining >= 60) {
                    return "images/battery-yellow.svg";
                } else if (battery_remaining >= 30) {
                    return "images/battery-red.svg";
                } else {
                    return "images/battery-empty.svg";
                }
            }
        }

    });
    return BatteryWidget;

});