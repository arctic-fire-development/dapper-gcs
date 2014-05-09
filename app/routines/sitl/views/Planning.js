define(['backbone', 'JST'], function(Backbone, templates) {

    var Planning = Backbone.View.extend({

        el: '#planning',
        template: templates['app/routines/sitl/Templates/planning'],

        initialize : function (options) {
          this.options = options || {};
        },

        events: {
            'click .continue' : 'continue'
        },

        continue: function() {
            this.options.deferred.resolve();
        },

        render: function() {
            this.$el.html(this.template);
            return this;
        }

    });

    return Planning;

});