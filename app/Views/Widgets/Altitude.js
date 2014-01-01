define(['backbone', 'JST'], function(Backbone, template) {

  var AltitudeWidget = Backbone.View.extend({

    el: '#altitudeWidget',
    template: template['app/Templates/altitudeWidget'],
    className: 'widget',

    initialize: function(){
      _.bindAll(this);
      this.model.on("change:alt", this.render, this);
    },
    render: function() {
      this.$el.html(this.template(
        {alt: Number(this.model.get('alt')).toFixed(1)}));
    }

  });
  return AltitudeWidget;

});