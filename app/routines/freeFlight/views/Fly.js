define(['backbone', 'JST', 'q', 'leaflet-dist', 'seiyria-bootstrap-slider',

    // Models
    'Models/Mission',

    // Widgets (subviews)
    'Views/Widgets/Speed',
    'Views/Widgets/Map',
    'Views/Widgets/Altitude',

], function(Backbone, templates, Q, L, BS,
    // Models
    Mission,

    // Widgets (subviews)
    SpeedWidget,
    MapWidget,
    AltitudeWidget
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

            Q($.get('/plugins/freeFlight/mission/launch')).then(_.bind(function(data) {

                // Swap buttons out
                this.$el.find('button.launch').hide();
                this.$el.find('button.home').show();

                // Enable altitude control
                this.altitudeWidget.enable();

            }, function(xhr) {
                // on failure?
                console.log(xhr);
            }, this));
        },

        render: function() {
            try {
                if (false === this.hasRendered) {
                    this.renderLayout();
                }
            } catch(e) {
                console.log(e);
            }
        },

        // Meant to be run only once; renders scaffolding and subviews.
        renderLayout: function() {

            // Render scaffolding
            this.$el.html(this.template);

            // Instantiate subviews, now that their elements are present on the page
            this.speedWidget = new SpeedWidget({
                model: this.model.get('platform')
            });
            this.mapWidget = new MapWidget({
                model: this.model.get('platform')
            });
            this.altitudeWidget = new AltitudeWidget({
                model: this.model.get('platform')
            });

            // Render party
            this.speedWidget.render();
            this.mapWidget.render();
            this.altitudeWidget.render();
            
            this.mapWidget.map.on('mousedown', function(e) {
                console.log(this.model.get('platform'));
                this.targetMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(this.mapWidget.map);
                $.get('/plugins/freeFlight/mission/flyToPoint', { lat: e.latlng.lat, lng: e.latlng.lng });
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
                console.log(this.targetMarker);
                this.mapWidget.map.removeLayer(this.targetMarker);
                this.mapWidget.map.removeLayer(this.targetLine);
            }, this);

        }

    });

    return FreeFlightFlyView;

});