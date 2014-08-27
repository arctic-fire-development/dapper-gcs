define(['backbone', 'leaflet-dist', 'leaflet-bing-plugin', 'leaflet-touch-extend'], function(Backbone, L, LBP, LTE) {

    var MapWidget = Backbone.View.extend({

        el: '#mapWidget',
        className: 'widget',
        hasRendered: false,
        map: undefined, // will be Leaflet map object

        initialize: function() {
            _.bindAll(this, 'render', 'renderLayout');
            this.breadcrumb = [];
        },

        render: function() {
            if (false === this.hasRendered) {
                // Do initial map setup
                this.renderLayout();
                this.hasRendered = true;
            }

        },

        renderLayout: function() {

            // Define specific path to default Leaflet images
            L.Icon.Default.imagePath = '/images/leaflet';

            // create a map in the "map" div, set the view to a given place and zoom
            this.map = L.map('mapWidget', {
                minZoom: 1,
                maxZoom: 18,
                zoomControl: false,
                scrollWheelZoom: false,
                tap: true,
                attributionControl: false
            }).setView([64.9, -147.1], 18);

            new L.Control.Zoom( {position: 'topright' }).addTo(this.map);

            var bing = new L.BingLayer("ArSmVTJNY8ZXaAjsxCHf989sG9OqZW3Qf0t1SAdM43Rn9pZpFyWU1jfYv_FFQlLO", {
                zIndex: 0
            });
            this.map.addLayer(bing);

            // Resize to fill the screen; respond to screen size change events.
            $('#mapWidget').height($(window).height());
            $('#mapWidget').width($(window).width());
            this.map.invalidateSize(false); // force Leaflet resize, do not animate
            $(window).resize(_.debounce(_.bind(function() {
                this.resizeMap();
                this.map.invalidateSize();
            }, this), 250));

            this.resizeMap();

            // When home position is established, mark it on the map.
            this.model.on('armed', function() {

                var homeIcon = L.icon({
                    iconUrl: '/images/home.min.svg',
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
                });

                this.marker = L.marker([this.model.get('homeLat'), this.model.get('homeLon')], {
                    icon: homeIcon
                }).addTo(this.map);

            }, this);

        },

        resizeMap: function() {
            var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            $('#mapWidget').width(w).height(h - $('#main-navbar').height());
        }
    });
    return MapWidget;

});