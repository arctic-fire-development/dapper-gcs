// Widget to display the radio signal strength
define(['require', 'backbone', 'JST'], function(require, Backbone, templates) {

    var SignalStrengthWidget = Backbone.View.extend({

        el: '#signalStrengthWidget',
        template: templates['app/Templates/signalStrengthWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render', 'getIcon');
            this.model.on("change:strength change:connected", this.render, this);
        },

        render: function() {
            this.$el.html(this.template({
                icon: this.getIcon()
            }));
        },

        getIcon: function() {
            // This generates a path to the images relative to the directory containing
            // the html, so the correct path should be automatically generated.
            var imagesDir = require.toUrl("../../../../images/");

            if (!this.model.get('connected')) {
                return imagesDir + "no-signal.min.svg";
            } else {
                var signalStrength = this.model.get('strength');
                if (signalStrength >= 90) {
                    return imagesDir + "4-bars.min.svg";
                } else if (signalStrength >= 60) {
                    return imagesDir + "3-bars.min.svg";
                } else if (signalStrength >= 30) {
                    return imagesDir + "2-bars.min.svg";
                } else {
                    return imagesDir + "1-bar.min.svg";
                }
            }
        }

    });

    return SignalStrengthWidget;

});