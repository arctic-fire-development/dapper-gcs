define(['backbone', 'JST', 'q', 'bootstrap', 'app'], function(Backbone, templates, Q, BS, app) {

    var HomeView = Backbone.View.extend({

        el: '#home',
        template: templates['app/Templates/home'],
        events: {
            'click #gotoFly' : 'gotoFly'
        },
        render: function() {

            Q($.get('/routine')).then(_.bind(function(data) {
                this.$el.html(this.template(this.model.toJSON()));
            }, this));

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

    return HomeView;

});