define(['backbone', 'JST'], function(Backbone, templates) {

    var BatteryWidget = Backbone.View.extend({

        el: '#batteryWidget',
        template: templates['app/Templates/batteryWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');
            this.model.on('change:battery_remaining', this.render, this);
        },

        render: function() {
            var battery = this.model.get('battery_remaining');
            if (battery < 0) {
                battery = 0;
            }
            this.$el.html(this.template({
                battery_remaining: battery
            }));

            /* Commenting out instead of nuking to keep the intent in place,
                though it will likely be replaced by a Bootstrap method.

                *** Is this so far gone in the past it's not worth keeping even the comments any more?

                this.$('#battery_image').toolbar({
                    content: '#battery_toolbar_display',
                    hideOnClick: true,
                    position: 'right'
                });
                */
        }

        // Keeping this stub in.  It's a good idea but needs a bit more time to take it over the finish line,
        // (vary bar length dynamically, align with Growl notifications, figure out position on screen when
        // on tablets etc.  For now go with plain ol' %, which nobody can really argue with.
        /*
        getIcon: function() {
            if (!this.model.get('battery_remaining')) {
                return "/images/battery-empty.min.svg";
            } else {
                var battery_remaining = this.model.get('battery_remaining');
                if (battery_remaining >= 50) {
                    return "/images/battery-green.min.svg";
                } else if (battery_remaining >= 25) {
                    return "/images/battery-yellow.min.svg";
                } else if (battery_remaining >= 10) {
                    return "/images/battery-red.min.svg";
                } else {
                    return "/images/battery-empty.min.svg";
                }
            }
        }
        */

    });
    return BatteryWidget;

});
