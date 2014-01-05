define(['backbone', 'JST'], function(Backbone, template) {

    var BatteryWidget = Backbone.View.extend({

        el: '#batteryWidget',
        template: template['app/Templates/batteryWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this);
            this.model.on('change:current_battery', this.render, this);
            this.model.on('change:voltage_battery', this.render, this);
            this.model.on('change:battery_remaining', this.render, this);
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
                return "images/battery-empty.min.svg";
            } else {
                var battery_remaining = this.model.get('battery_remaining');
                if (battery_remaining >= 90) {
                    return "images/battery-green.min.svg";
                } else if (battery_remaining >= 60) {
                    return "images/battery-yellow.min.svg";
                } else if (battery_remaining >= 30) {
                    return "images/battery-red.min.svg";
                } else {
                    return "images/battery-empty.min.svg";
                }
            }
        }

    });
    return BatteryWidget;

});