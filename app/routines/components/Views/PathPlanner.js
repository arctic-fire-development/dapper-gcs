define(['backbone', 'JST', 'leaflet-dist', 'concavehull', 'd3', 'evispa-timo-jsclipper', 'leaflet.freedraw'],
    function(Backbone, templates, L, ConcaveHull, d3, JSClipper, LFD) {

    var PathPlanner = Backbone.View.extend({

        el: '#pathPlanner',
        template: templates['app/routines/components/Templates/PathPlanner'],

        events: {
            'click .close': 'close',
            'click label.pan': 'setPanMode',
            'click label.draw': 'setDrawMode'
        },

        updateParameters: function(e) {
            this.model.set(e.currentTarget.name, e.currentTarget.value);
            this.model.save();
        },

        close: function() {
            this.$el.hide();
        },

        setPanMode: function() {
            this.freeDraw.setMode(L.FreeDraw.MODES.VIEW);
        },

        setDrawMode: function() {
            this.freeDraw.setMode(L.FreeDraw.MODES.ALL ^ L.FreeDraw.MODES.DELETE);
        },

        render: function() {
            var hasRendered = false;
            this.$el.html(this.template()).show();
            if(false === hasRendered) {
                this.addBaseMap();
                this.addDrawingLayer();
            }
            return this;
        },

        addBaseMap: function() {

            // Define specific path to default Leaflet images
            L.Icon.Default.imagePath = '/images/leaflet';

            // create a map in the "map" div, set the view to a given place and zoom
            this.map = L.map('pathPlannerMapWidget', {
                zoomControl: false,
                scrollWheelZoom: false,
                tap: true,
                attributionControl: false
            }).setView([64.9, -147.1], 4);

            new L.Control.Zoom({
                position: 'topright'
            }).addTo(this.map);
            var wms = new L.tileLayer.wms(appConfig.mapProxyUrl, {
                layers: 'bing',
                format: 'image/png',
                transparent: true,
                attribution: 'cheddar is soft'
            })
            this.map.addLayer(wms);

            $('#pathPlannerModal').on('shown.bs.modal', _.bind(function(e) {
                this.map.invalidateSize(false);
            }, this));

        },

        addDrawingLayer: function() {

            // Hook in the drawing layers
            this.freeDraw = new L.FreeDraw({
                multiplePolygons: false
            });
            this.map.addLayer(this.freeDraw);

            // When the path is edited, save it
            this.freeDraw.on('markers', _.bind(function getMarkers(eventData) {
                this.model.set('latLngs', eventData.latLngs[0]);
            }, this));

        }
    });

    return PathPlanner;

});
