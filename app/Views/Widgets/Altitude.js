define(['backbone', 'JST'], function(Backbone, templates) {

    var AltitudeWidget = Backbone.View.extend({

        el: '#altitudeWidget',
        template: templates['app/Templates/altitudeWidget'],
        className: 'widget',
        hasRendered: false,

        // When this parameter is true, the render will be suspended.
        // This is used to allow the user to drag the altitude slider to a new
        // position and not have it get dragged around when altitude updates
        // from the UAV are received by the client.
        suspendSliderRender: false,

        initialize: function() {
            _.bindAll(this, 'render', 'enable', 'disable');
            this.model.on("change:relative_alt", this.render, this);
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
                    //enabled: false,
                    tooltip: 'always',
                    formater: function(v) {
                        return v + ' meters'
                    }
                });
                this.hasRendered = true;

            }
            
            // The weird number juggling is due mostly to this:
            // https://github.com/seiyria/bootstrap-slider/issues/135
            alt = parseInt(Number(this.model.get('relative_alt')).toFixed(0));
            this.$el.find('#altitudeWidgetValue').text(alt);
            if( false === this.suspendSliderRender) {
                this.slider.slider('setValue', alt);
            }

        }

    });
    return AltitudeWidget;

});