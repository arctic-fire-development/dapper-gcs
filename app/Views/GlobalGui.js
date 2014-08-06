define(['backbone', 'JST', 'q', 'bootstrap', 'app'], function(Backbone, templates, Q, BS, app) {

    var GlobalGuiView = Backbone.View.extend({

        el: '#global',
        template: templates['app/Templates/globalGui'],
        events: {
            'click #gotoFly' : 'gotoFly'
        },
        render: function() {
            this.$el.html(this.template);
            return this;
        },

        renderRoutineStartedModalOverride: function() {
            $('#routineStartedModalOverride').modal({
                backdrop: 'static', // forbid dismiss by click
                keyboard: false // forbid dismiss by escape
            });
        },

        gotoFly: function() {
            app.router.navigate('mission/fly', { trigger: true });
        }

    });

    return GlobalGuiView;

});