define(['backbone', 'JST', 'leaflet', 'd3', 'leaflet-pather'],
    function(Backbone, templates, L, d3, LP) {

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
            this.pather.setMode(L.Pather.MODE.VIEW);
        },

        setDrawMode: function() {
            this.pather.setMode(
                L.Pather.MODE.ALL
                ^L.Pather.MODE.DELETE
            );
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
            this.pather = new L.Pather({
                mode: L.Pather.MODE.VIEW
            });
            this.map.addLayer(this.pather);

            // When the path is edited, save it
            this.pather.on('created', _.bind(function getMarkers(eventData) {
                this.model.set('latLngs', eventData.latLngs);
            }, this));

        }
    });

    return PathPlanner;

});
