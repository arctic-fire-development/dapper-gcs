define(['backbone', 'JST', 'q', 'leaflet-dist', 'bootstrap-slider',

    // Models
    'Models/Mission',

    // Widgets (subviews)
    'Views/Widgets/Speed',
    'Views/Widgets/Map',
    'Views/Widgets/Altitude',
    'Views/Widgets/Platform',

], function(Backbone, templates, Q, L, BS,
    // Models
    Mission,

    // Widgets (subviews)
    SpeedWidget,
    MapWidget,
    AltitudeWidget,
    PlatformWidget
) {

    var FreeFlightFlyView = Backbone.View.extend({

        model: Mission,
        el: '#fly',
        template: templates['app/routines/freeFlight/Templates/missionLayout'],
        hasRendered: false,

        events: {
            'click button.launch' : 'launch'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'renderLayout', 'launch');
        },

        launch: function() {

            Q($.get('/drone/launch')).then(_.bind(function() {

                // Swap buttons out
                this.$el.find('button.launch').hide();
                this.$el.find('button.home').show();

                // Enable altitude control
                this.altitudeWidget.enable();

            }, this));
        },

        render: function() {
            try {
                if (false === this.hasRendered) {
                    this.renderLayout();
                    this.hasRendered = true;
                }
            } catch(e) {
                console.log(e);
            }
        },

        bindMapClickEvents: function() {

            this.mapWidget.map.on('mousedown', function(e) {
                this.targetMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(this.mapWidget.map);
                $.get('/drone/flyToPoint', { lat: e.latlng.lat, lng: e.latlng.lng });
                this.targetLine = L.polyline(
                    [
                        L.latLng(e.latlng.lat, e.latlng.lng),
                        L.latLng(
                            this.model.get('platform').get('lat'),
                            this.model.get('platform').get('lon')
                        )
                    ],
                    {
                        color: 'red'
                    }
                ).addTo(this.mapWidget.map);
            }, this);

            this.mapWidget.map.on('mouseup', function(e) {
                // Switch mode to Loiter?
                $.get('/drone/loiter', { lat: e.latlng.lat, lng: e.latlng.lng });
                this.mapWidget.map.removeLayer(this.targetMarker);
                this.mapWidget.map.removeLayer(this.targetLine);
            }, this);

            // When the slider is being dragged, prevent the slider from
            // being updated while the user has the mouse down,
            // and send updated altitude requests to the UAV.
            this.altitudeWidget.slider.on('slide', _.bind(function(slideEvt) {
                this.altitudeWidget.suspendSliderRender = true;
                $.get('/drone/changeAltitude', { alt: slideEvt.value });
            }, this));

            // After the user releases the slider, reattach live updating
            // and do an immediate refresh.
            // Send a final alt adjustment to the current altitude.
            this.altitudeWidget.slider.on('slideStop', _.bind(function(slideEvt) {
                $.get('/drone/changeAltitude', { alt: this.model.get('platform').get('relative_alt') });
                this.altitudeWidget.suspendSliderRender = false;
                this.altitudeWidget.render();
            }, this));

        },

        // Meant to be run only once; renders scaffolding and subviews.
        renderLayout: function() {

            // Render scaffolding
            this.$el.html(this.template);

            // Only render actual fly view once we've got GPS fix.
            this.model.get('platform').once('gps:fix_established', function() {

                this.$el.find('#waitForGps').hide();
                this.$el.find('#widgets').show();

                // Instantiate subviews, now that their elements are present on the page
                this.speedWidget = new SpeedWidget({
                    model: this.model.get('platform')
                });
                this.altitudeWidget = new AltitudeWidget({
                    model: this.model.get('platform'),
                    maxAltitude: this.model.get('planning').get('maxAltitude')
                });
                this.mapWidget = new MapWidget({
                    model: this.model.get('platform')
                });
                this.platformWidget = new PlatformWidget({
                    model: this.model.get('platform')
                });

                // Render party
                this.speedWidget.render();
                this.altitudeWidget.render();
                this.mapWidget.render();
                this.bindMapClickEvents();

                // Must configure/render this only after the map has been rendered.
                this.platformWidget.map = this.mapWidget.map;
                this.platformWidget.render();
                
                // If we're in flight, change the GUI as needed.
                // TODO: more needs to be done here, manage Fly button, etc.
                if(this.model.get('platform').get('relative_alt') > 0) {
                    this.altitudeWidget.enable();
                }

            }, this);
            
        }

    });

    return FreeFlightFlyView;

});