define(['backbone', 'JST'], function(Backbone, templates) {

    var PostRoutine = Backbone.View.extend({

        el: '#postroutine',
        template: templates['app/routines/freeFlight/Templates/postRoutine'],

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
            $('#postRoutineChecklist').click(function() {
                window.open('/postRoutineChecklist', 'Post Routine Checklist');
            });
            return this;
        }

    });

    return PostRoutine;

});
