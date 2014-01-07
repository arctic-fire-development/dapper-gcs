define(['backbone', 'JST'], function(Backbone, template) {

    var GpsWidget = Backbone.View.extend({

        el: '#gpsWidget',
        template: template['app/Templates/gpsWidget'],
        className: 'widget',

        initialize: function() {

            _.bindAll(this);
            this.model.on('change:lat', this.render);
            this.model.on('change:lon', this.render);
            this.model.on('change:fix_type', this.render);
            this.model.on('change:satellites_visible', this.render);

        },

        render: function() {

            this.$el.html(this.template({
                icon: this.getIcon(),
                lat: this.model.get('lat'),
                lon: this.model.get('lon'),
                fix_type: this.model.get('fix_type'),
                satellites_visible: this.model.get('satellites_visible')
            }));

            this.$('.gps_values a').on('click', function(event) {
                event.preventDefault();
            });

            this.$('#gps_image').toolbar({
                content: '#gps_toolbar_display',
                hideOnClick: true,
                position: 'right'
            });

        },

        getIcon: function() {
            if (!this.model.get('satellites_visible')) {
                return "images/gps-empty.min.svg";
            } else {
                var satellites_visible = this.model.get('satellites_visible');
                if (satellites_visible >= 6) {
                    return "images/gps-green.min.svg";
                } else if (satellites_visible >= 4) {
                    return "images/gps-yellow.min.svg";
                } else if (satellites_visible >= 2) {
                    return "images/gps-red.min.svg";
                } else {
                    return "images/gps-empty.min.svg";
                }
            }
        }

    });
    return GpsWidget;

});


// fix_type: undefined,
// satellites_visible: undefined,