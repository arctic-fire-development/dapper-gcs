define(['backbone', 'JST'], function(Backbone, templates) {

    var PlanView = Backbone.View.extend({

        el: '#plan',
        template: templates['app/Templates/plan'],

        render: function() {

            // Render scaffolding
            this.$el.html(this.template);
            return this;

        }

    });

    return PlanView;

});