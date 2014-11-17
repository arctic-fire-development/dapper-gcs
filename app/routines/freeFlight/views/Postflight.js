define(['backbone', 'JST'], function(Backbone, templates) {

    var Postflight = Backbone.View.extend({

        el: '#postflight',
        template: templates['app/routines/freeFlight/Templates/postflight'],

        // Pull in options for automatic assignment of properties.
        initialize: function(options) {
            this.options = options || {};
        },

        events: {
            'click .continue': 'continue'
        },

        continue: function() {

            if (true === this.forceContinue) {
                this.options.deferred.resolve();
            } else {
                this.checkIfPostflightCompleted();
            }

        },

        checkIfPostflightCompleted: function() {

            // Hinky but gets the job done for the moment.  Probably, let's do better before submitting the code.
            if (4 !== this.$el.find('.checklist .manual .btn-success.active').length || this.$el.find('#flightLogNotes').value == '') {
                this.$el.find('.continue').html('Flight log notes and checklist not completed, continue anyway?').removeClass('btn-primary').addClass('btn-default');
                this.forceContinue = true;
            } else {
                this.options.deferred.resolve();
            }
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    return Postflight;

});
