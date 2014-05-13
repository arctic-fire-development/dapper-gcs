define(['backbone', 'JST'], function(Backbone, templates) {

    var Planning = Backbone.View.extend({

        el: '#planning',
        template: templates['app/routines/freeFlight/Templates/planning'],

        // Pull in options for automatic assignment of properties.
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
            console.log(this);
            this.$el.html(this.template, {
                mission: this.options.mission.toJSON()
            });
            return this;
        }

    });

    return Planning;

});