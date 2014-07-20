define(['backbone', 'JST'], function(Backbone, templates) {

    var Planning = Backbone.View.extend({

        el: '#planning',
        template: templates['app/routines/freeFlight/Templates/planning'],

        // Pull in options for automatic assignment of properties.
        initialize : function (options) {
          this.options = options || {};
        },

        events: {
            'click .continue' : 'continue',
            'change input' : 'updateParameters',
            'change input[name="maxAltitude"]' : 'metersToFeet'
        },

        updateParameters: function(e) {
            this.model.set(e.currentTarget.name, e.currentTarget.value);
            this.model.save();
        },

        metersToFeet: function() {
            this.$el.find('.toFeet').html(
                _.template('<span><%= feet %></span>ft',
                    {
                        feet: parseInt(this.$('#maxAltitude')[0].value * 3.28084, 10)
                    }
                )
            )
        },

        continue: function() {
            this.model.save();
            this.options.deferred.resolve();
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.metersToFeet();
            return this;
        }

    });

    return Planning;

});