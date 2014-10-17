define(['backbone', 'JST'], function(Backbone, templates) {

    var MapCacheLoader = Backbone.View.extend({

        el: '#mapCacheLoader',
        template: templates['app/routines/components/Templates/MapCacheLoader'],

        events: {
            'click .close' : 'close'
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
            this.map = L.map('mapCacheLoaderWidget', {
                zoomControl: false,
                scrollWheelZoom: false,
                tap: true,
                attributionControl: false
            }).setView([64.9, -147.1], 4);

            new L.Control.Zoom( {position: 'topright' }).addTo(this.map);
            var wms = new L.tileLayer.wms(appConfig.mapProxyUrl, {
                layers: 'bing',
                format: 'image/png',
                transparent: true,
                attribution: 'cheddar is soft'
            })
            this.map.addLayer(wms);

            $('#mapCacheLoaderModal').on('shown.bs.modal', _.bind(function (e) {
                this.map.invalidateSize(false);
            }, this));

            return this;
        }

    });

    return MapCacheLoader;

});