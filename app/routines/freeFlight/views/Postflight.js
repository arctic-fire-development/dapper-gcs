define(['backbone', 'JST'], function(Backbone, templates) {

    var Postflight = Backbone.View.extend({

        el: '#postflight',
        template: templates['app/routines/freeFlight/Templates/postflight'],

        // Pull in options for automatic assignment of properties.
        initialize: function(options) {
            this.options = options || {};
        },

        events: {
            'click .continue': 'continue',
            'change input': 'updateParameters',
            'change select': 'updateParameters',
        },

        updateParameters: function(e) {
            this.model.set(e.currentTarget.name, e.currentTarget.value);
            this.model.save();
        },

        continue: function() {
            this.options.deferred.resolve();
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            $('#postflightChecklist').click(function() {
                window.open('/postflightChecklist', 'Post Routine Checklist');
            });
            return this;
        }

    });

    return Postflight;

});
