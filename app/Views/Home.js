define(['backbone', 'JST'], function(Backbone, templates) {

    var HomeView = Backbone.View.extend({

        el: '#home',
        template: templates['app/Templates/home'],

        render: function() {

            // Render scaffolding
            this.$el.html(this.template);
            return this;

        }

    });

    return HomeView;

});