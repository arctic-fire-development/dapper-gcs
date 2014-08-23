'use strict';

define(['backbone', 'JST', 'q', 'bootstrap', 'app', 'moment', 'fuelux'], function(Backbone, templates, Q, BS, app, moment, fuelux) {

    var HomeView = Backbone.View.extend({

        el: '#home',
        template: templates['app/Templates/home'],

        render: function() {

            Q($.get('/routine')).then(_.bind(function() {
                this.$el.html(this.template(this.model.toJSON()));
            }, this));

        }

    });

    return HomeView;

});