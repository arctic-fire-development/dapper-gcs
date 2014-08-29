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

        initialize: function(options) {
            _.bindAll(this, 'render', 'enable', 'disable');

            this.maxAltitude = parseInt(options.maxAltitude, 10);

            //TODO remove reference to MAVLink-specific altitude message,
            // instead replace with the platform abstraction layer.
            // GH#122
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
                    enabled: false,
                    max: this.maxAltitude,
                    min: 0,
                    tooltip: 'always',
                    formater: function(v) {
                        return v + ' meters'
                    }
                });
                this.hasRendered = true;

            }

            this.$el.find('#altitudeWidgetValue').text(this.model.get('relative_alt'));
            if( false === this.suspendSliderRender) {
                this.slider.slider('setValue', this.model.get('relative_alt'));
            }

        }

    });
    return AltitudeWidget;

});