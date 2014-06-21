define(['backbone', 'JST'], function(Backbone, templates) {

    var AltitudeWidget = Backbone.View.extend({

        el: '#altitudeWidget',
        template: templates['app/Templates/altitudeWidget'],
        className: 'widget',
        hasRendered: false,

        initialize: function() {
            _.bindAll(this, 'render', 'enable');
            this.model.on("change:alt", this.render, this);
        },
        enable: function() {
            this.slider.slider('enable');
        },
        disable: function() {
            this.slider.slider('disable');
        },
        render: function() {

            if( false == this.hasRendered ) {
            
                this.$el.html(this.template());

                // Altitude slider is disabled to start with.
                this.slider = this.$el.find('#altitudeSlider');
                this.slider.slider({
                    reversed:true,
                    enabled: false,
                    tooltip: 'always',
                    formater: function(v) {
                        return v + ' meters'
                    }
                });
                
            }
            
            // The weird number juggling is due mostly to this:
            // https://github.com/seiyria/bootstrap-slider/issues/135
            this.slider.slider('setValue', parseInt(Number(this.model.get('alt')).toFixed(0) - 582), true);
            
        }

    });
    return AltitudeWidget;

});