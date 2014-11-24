define(['app','backbone', 'JST', 'underscore'], function(app, Backbone, templates, _) {

    var StatusWidget = Backbone.View.extend({

        el: '#statusWidget',
        template: templates['app/Templates/statusWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');
            //this.model.on('change', this.render);

            app.socket.on('status:custom_mode', _.bind(function(message){
                this.render();
            }, this));
        },

        render: function() {
            console.log(message);
            var data = {
                status: "hello"
            };
            this.$el.html(this.template(data));

        }

    });
    return StatusWidget;

});
