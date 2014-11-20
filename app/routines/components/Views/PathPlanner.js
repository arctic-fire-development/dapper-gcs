define(['backbone', 'JST', 'leaflet-dist', 'concavehull', 'd3', 'evispa-timo-jsclipper', 'leaflet.freedraw'],
    function(Backbone, templates, L, ConcaveHull, d3, JSClipper, LFD) {

    var PathPlanner = Backbone.View.extend({

        el: '#pathPlanner',
        template: templates['app/routines/components/Templates/PathPlanner'],

        events: {
            'click .close': 'close'
        },

        updateParameters: function(e) {
            this.model.set(e.currentTarget.name, e.currentTarget.value);
            this.model.save();
        },

        close: function() {
            this.$el.hide();
        },

        render: function() {
            this.$el.html(this.template()).show();

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

            // Hook in the drawing layers
            this.map.addLayer(new L.FreeDraw({
                mode: L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.EDIT
            }));
            return this;
        }

    });

    return PathPlanner;

});
