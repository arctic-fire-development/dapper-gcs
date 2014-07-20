define(['backbone', 'JST', 'q', 'leaflet-dist', 'bootstrap-slider', 'bootstrap-growl',

    // Models
    'Models/Mission',

    // Widgets (subviews)
    'Views/Widgets/Speed',
    'Views/Widgets/Map',
    'Views/Widgets/Altitude',
    'Views/Widgets/Platform',

], function(Backbone, templates, Q, L, BS, BG,
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
        
            this.bindGrowlNotifications();

        },

        // Hook up various growl notifications.
        bindGrowlNotifications: function() {

            this.model.get('connection').on('change:notification', function() {

                var message, type;
                switch(this.get('notification')) {
                    case 'lost': message = '<span class="glyphicon glyphicon-signal"></span> Connection lost, trying to reconnect&hellip;', type='warning'; break;
                    case 'regained': message = '<span class="glyphicon glyphicon-signal"></span> Connection restored.', type='success'; break;
                }
                
                this.growl(message);

            }, this);

            // Bind notifications to change events on the platform
            this.model.get('platform').on('change:custom_mode', function() {
                
                var message, type='info', delay = 6000, mode = this.model.get('platform').get('custom_mode');
                
                if(0 == mode) return; // ignore whatever this means.  possible TODO, figure out why it can be 0?  pre-boot?

                switch(mode) {
                    case 3: message = "Performing takeoff&hellip;"; break;
                    case 5: message = "Hovering until further notice."; break;
                    case 4: message = "Flying to location&hellip;"; break;
                    default: message = "Switching to custom_mode " + mode, delay=10000, type='danger';
                }

                this.growl(message, type, delay);

            }, this);

            // Battery notifications
            var batteryIcon = '<span class="glyphicon glyphicon-flash"></span>';
            this.model.get('platform').once('battery:half', function() {
                this.growl(batteryIcon + ' Battery is at half power.');
            }, this);
            this.model.get('platform').once('battery:quarter', function() {
                this.growl(
                    batteryIcon + ' Battery is at quarter power.',
                    'warning',
                    1000000000 // persistent
                );
            }, this);
            this.model.get('platform').once('battery:low', function() {
                this.growl(
                    batteryIcon + ' Battery is very low, land safely immediately.',
                    'danger',
                    1000000000
                );
            }, this);
        },

        growl: function(message, type, delay) {
            
            type = type || 'info';
            delay = delay || 6000; // ms

            $.bootstrapGrowl(message, {
                ele: 'body', // which element to append to
                type: type, // (null, 'info', 'danger', 'success')
                offset: {from: 'top', amount: 20}, // 'top', or 'bottom'
                align: 'right', // ('left', 'right', or 'center')
                width: 250, // (integer, or 'auto')
                delay: delay, // Time while the message will be displayed. It's not equivalent to the *demo* timeOut!
                allow_dismiss: true, // If true then will display a cross to close the popup.
                stackup_spacing: 10 // spacing between consecutively stacked growls.
            });

        }

    });

    return FreeFlightFlyView;

});