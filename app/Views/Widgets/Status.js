define(['app','backbone', 'JST'], function(app, Backbone, templates) {

    var StatusWidget = Backbone.View.extend({

        el: '#statusWidget',
        template: templates['app/Templates/statusWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');
            this.model.on('change', this.render);
            app.socket.on('linkStatus', function(data){
                console.log(data);
            });
        },

        render: function() {

            this.$el.html(this.template());

        }

    });
    return StatusWidget;

});
