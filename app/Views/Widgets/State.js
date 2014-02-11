define(['backbone', 'JST'], function(Backbone, templates) {

    var StateWidget = Backbone.View.extend({

        el: '#stateWidget',
        template: templates['app/Templates/stateWidget'],
        className: 'widget',

        render: function() {

            this.$el.html(this.template());

        }

    });
    return StateWidget;

});