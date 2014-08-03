define(['backbone', 'JST', 'q'], function(Backbone, templates, Q) {

    var HomeView = Backbone.View.extend({

        el: '#home',
        template: templates['app/Templates/home'],

        render: function() {
            
            Q($.get('/routine')).then(_.bind(function(data) {
                this.$el.html(this.template(this.model.toJSON()));    
            }, this));
            
        }

    });

    return HomeView;

});