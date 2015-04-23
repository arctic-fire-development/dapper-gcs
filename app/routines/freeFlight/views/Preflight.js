define(['backbone', 'JST',

    // Common widgets
    'Views/Widgets/Connection'

], function(Backbone, templates,
    ConnectionWidget) {

    var Preflight = Backbone.View.extend({

        el: '#preflight',
        template: templates['app/routines/freeFlight/Templates/preflight'],

        // If true, the user is forcing their way past pre-flight even though manual checks aren't done
        forceContinue: false,

        initialize: function(options) {
            _.bindAll(this, 'render');
            this.options = options || {};
        },

        events: {
            'click .continue': 'continue'
        },

        continue: function(e) {
            e.preventDefault(); // prevent any other odd navigation from happening!

            if (true === this.forceContinue) {
                this.options.deferred.resolve();
            }

            var allCheckedYes = true;
            this.$el.find('.checklist .manual input:radio:checked').each(function(){
                if("no" === $(this).val()){
                    allCheckedYes = false;
                }
            });

            if (false === allCheckedYes) {
                this.$el.find('.continue').html('Checklist not completed, OK to continue?').removeClass('btn-primary').addClass('btn-default');
                this.forceContinue = true;
            } else {
                this.options.deferred.resolve();
            }
        },

        render: function() {
            this.$el.html(this.template({
                parameters: this.options.parameters
            }));

            this.connectionView = new ConnectionWidget({
                model: this.model,
                el: $('#preflightSitlConnectionManager')
            });

            this.connectionView.render();

            return this;
        }

    });

    return Preflight;

});
