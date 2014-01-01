define(['backbone', 'JST'], function(Backbone, template) {

  var StateWidget = Backbone.View.extend({

    el: '#StateWidget',
    template: template['app/Templates/stateWidget'],
    className: 'widget',

    render: function() {

      this.$el.html(this.template());

    }

  });
  return StateWidget;

});