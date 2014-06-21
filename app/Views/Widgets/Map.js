define(['backbone', 'leaflet-dist', 'leaflet-bing-plugin'], function(Backbone, L) {

    var MapWidget = Backbone.View.extend({

        el: '#mapWidget',
        className: 'widget',
        hasRendered: false,
        map: undefined, // will be Leaflet map object

        initialize: function() {

            _.bindAll(this, 'render', 'renderLayout');
            this.model.on('change:lat change:lon', this.render);
            this.breadcrumb = [];
        },

        render: function() {
            lat = this.model.get('lat') || 64.88317;
            lon = this.model.get('lon') || -147.6137;

            if (false === this.hasRendered) {
                // Do initial map setup
                this.renderLayout();
                this.hasRendered = true;

            }

            var LatLng = new L.LatLng(lat, lon);

            var m = new L.CircleMarker(LatLng).setRadius(10);
            this.breadcrumb.unshift(m);

            if (this.breadcrumb.length > 50) {
                this.breadcrumb[1].addTo(this.map);
                this.map.removeLayer(this.breadcrumb.pop());
                _.each(this.breadcrumb, function(e, i, l) {
                    e.setStyle({
                        fillOpacity: 1 / (i + 1),
                        opacity: 2 * (1 / (1 + i))
                    });
                }, this);
            }

            var map = this.map;
            var panMap = _.throttle(function() {
                map.panTo(LatLng);
            }, 5000);
            panMap();

            this.marker.setLatLng(LatLng);

            // Commenting this out instead of nuking for the moment because the functionality
            // can be patched/restored, but this method is out of date.
            // this.marker.setIconAngle(this.model.get('heading'));

        },

        renderLayout: function() {

            // Define specific path to default Leaflet images
            L.Icon.Default.imagePath = '/images/leaflet';

            // create a map in the "map" div, set the view to a given place and zoom
            this.map = L.map('mapWidget', {
                minZoom: 1,
                maxZoom: 24,
                zoomControl: false // to reposition
            }).setView([64.9, -147.1], 16);

            new L.Control.Zoom( {position: 'topright' }).addTo(this.map);

            this.myIcon = L.icon({
                iconUrl: '/images/jet.min.svg',
                iconSize: [50, 100],
                iconAnchor: [25, 50],
                popupAnchor: [-3, -76]
            });

            this.marker = L.marker([64.9, -147.1], {
                icon: this.myIcon,
                iconAngle: 0
            }).addTo(this.map);

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

        },

        resizeMap: function() {
            var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            $('#mapWidget').width(w).height(h - $('#main-navbar').height());
        }
    });
    return MapWidget;

});