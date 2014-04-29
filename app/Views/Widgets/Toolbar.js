define(['backbone', 'JST'], function(Backbone, templates, toolbar) {

    var ToolbarWidget = Backbone.View.extend({

        el: '#toolbarWidget',
        template: templates['app/Templates/toolbarWidget'],

        initialize: function() {
            _.bindAll(this, 'render');
        },

        render: function() {
            this.$el.html(this.template());

            $('.toolbar-icons a').on('click', function(event) {
                event.preventDefault();
            });

        }

    });
    return ToolbarWidget;

});