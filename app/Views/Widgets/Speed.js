define(['backbone', 'JST'], function(Backbone, templates) {

    var SpeedWidget = Backbone.View.extend({

        el: '#speedWidget',
        template: templates['app/Templates/speedWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');
            this.model.on('change:groundspeed', this.render);
        },

        render: function() {
            var data = {
                groundspeed: Number(this.model.get('groundspeed')).toFixed(0)
            };

            this.$el.html(this.template(data));
        }

    });
    return SpeedWidget;

});