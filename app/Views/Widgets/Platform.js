define(['backbone', 'leaflet-dist', 'leaflet-rotate-marker'], function(Backbone, L, LRM) {

    var PlatformWidget = Backbone.View.extend({

        hasRendered: false,

        initialize: function(options) {
            _.bindAll(this, 'render');
            this.map = options.map;
            this.model.on('change:lat change:lon', this.render, this);
            this.breadcrumb = [];
        },

        render: function() {

            lat = this.model.get('lat');
            lon = this.model.get('lon');

            var LatLng = new L.LatLng(lat, lon);

            if(false === this.hasRendered) {

                this.myIcon = L.icon({
                    iconUrl: '/images/quadcopter.png',
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
                });

                this.marker = L.marker([64.9, -147.1], {
                    icon: this.myIcon,
                    iconAngle: 0
                }).addTo(this.map);

                // Do once;
                this.map.panTo(LatLng);

                this.hasRendered = true;
            }

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

            this.marker.setLatLng(LatLng);
            this.marker.setIconAngle(this.model.get('heading'));

        }
    });
    return PlatformWidget;

});