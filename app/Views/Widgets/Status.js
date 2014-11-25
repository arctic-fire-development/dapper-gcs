define(['app','backbone', 'JST', 'underscore'], function(app, Backbone, templates, _) {

    var StatusWidget = Backbone.View.extend({

        el: '#statusWidget',
        template: templates['app/Templates/statusWidget'],
        className: 'widget',

        initialize: function() {
            _.bindAll(this, 'render');
            //this.model.on('change', this.render);

            app.socket.on('status:custom_mode', _.bind(function(message){
                try{
                    this.render(message);
                }catch(e){
                    console.log(e);
                    console.log(e.stack);
                }
            }, this));
        },

        render: function(message) {
            var data = {
                status: message
            };
            this.$el.html(this.template(data));

        }

    });
    return StatusWidget;

});
