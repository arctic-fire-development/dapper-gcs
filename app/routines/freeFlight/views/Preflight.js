define(['backbone', 'JST',

    // Common widgets
    'Views/Widgets/Connection'

], function(Backbone, templates,
    ConnectionWidget) {

    var Preflight = Backbone.View.extend({

        el: '#preflight',
        template: templates['app/routines/freeFlight/Templates/preflight'],

        initialize : function (options) {
            _.bindAll(this, 'render');
            this.options = options || {};
        },

        events: {
            'click .continue' : 'continue'
        },

        continue: function(e) {
            e.preventDefault(); // prevent any other odd navigation from happening!
            this.options.deferred.resolve();
        },

        render: function() {
            this.$el.html(this.template({
                parameters: this.options.parameters
            }));

            this.connectionView = new ConnectionWidget({
                model: this.model,
                el: $('#preflightSitlConnectionManager')
            });

            this.connectionView.render();

            return this;
        }

    });

    return Preflight;

});