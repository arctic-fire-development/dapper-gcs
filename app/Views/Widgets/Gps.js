define(['backbone', 'JST'], function(Backbone, template) {

    var GpsWidget = Backbone.View.extend({

        el: '#gpsWidget',
        template: template['app/Templates/gpsWidget'],
        className: 'widget',

        initialize: function() {
            this.listenTo(this.model, 'change:lat', this.render);
            this.listenTo(this.model, 'change:lon', this.render);
            this.listenTo(this.model, 'change:fix_type', this.render);
            this.listenTo(this.model, 'change:satellites_visible', this.render);
        },

        render: function() {

            this.$el.html(this.template({
                lat: this.model.get('lat'),
                lon: this.model.get('lon'),
                fix_type: this.model.get('fix_type'),
                satellites_visible: this.model.get('satellites_visible')
            }));

        }

    });
    return GpsWidget;

});
