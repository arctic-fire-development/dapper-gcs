define(['app', 'backbone', 'JST', 'q', 'leaflet-dist', 'bootstrap-slider', 'underscore',

    // Models
    'Models/Mission',

    // Widgets (subviews)
    'Views/Widgets/Speed',
    'Views/Widgets/Map',
    'Views/Widgets/Altitude',
    'Views/Widgets/Battery',
    'Views/Widgets/Platform',

], function(app, Backbone, templates, Q, L, BS, _,
    // Models
    Mission,

    // Widgets (subviews)
    SpeedWidget,
    MapWidget,
    AltitudeWidget,
    BatteryWidget,
    PlatformWidget
) {

    var FreeFlightFlyView = Backbone.View.extend({

        model: Mission,
        el: '#fly',
        template: templates['app/routines/freeFlight/Templates/fly'],

        // Set to true when the scaffolding (map, layout) has rendered
        hasRendered: false,

        // Set to true when fly-to-point and/or other map controls for flight ops are bound to map
        mapEventsAreBound: false,

        events: {
            'click button.launch' : 'launch',
            'click button.home' : 'home',
            'click button.stop' : 'stop'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'renderLayout', 'launch', 'home', 'stop',
                'showControls', 'enableAltitudeSlider', 'enableFlyToPoint', 'renderWidgets',
                'regenerateGuiState');
        },

        showControls: function() {
            if(true === this.model.isOperator) {
                this.$el.find('#controls').show();
            } else {
                this.$el.find('#controls').hide();
            }
        },

        enableAltitudeSlider: function() {

            if(true === this.model.isOperator) {
                this.altitudeWidget.enable();
            } else {
                this.altitudeWidget.disable();
            }
        },

        enableFlyToPoint: function() {
            if(true === this.model.isOperator) {
                this.bindFlyToPoint();
            } else {
                this.unbindFlyToPoint();
            }
        },

        // Show the button with name className, hide others.
        showButton: function(className) {
            _.each(this.$el.find('button'), function(e) {
                $e = $(e);
                if($e.hasClass(className)) {
                    $e.show();
                } else {
                    $e.hide();
                }
            }, this);
        },

        home: function() {
            Q($.get('/drone/rtl')).then(_.bind(function() {

                // Disable user control while craft is in RTL.
                this.showButton('stop');
                this.unbindFlyToPoint();
                this.altitudeWidget.disable();

                // Detect when system has landed, then instruct disarm.
                this.model.platform.on('status:standby', function() {
                    Q($.get('/drone/disarm')).then(_.bind(function() {
                        this.showButton('launch');
                    }, this));
                }, this);

            }, this));
        },

        stop: function() {
            Q($.get('/drone/loiter')).then(_.bind(function() {
                // Switch back to free flight mode.
                this.showButton('home');
                this.altitudeWidget.enable();
                this.bindFlyToPoint();
            }, this));
        },

        launch: function() {

            // Swap the button text immediately for responsiveness
            this.$el.find('button.launch').html('Launching&hellip;');

            Q($.get('/drone/launch')).then(_.bind(function() {

                // Swap buttons out
                this.$el.find('button.launch').hide();
                this.$el.find('button.home').show().attr('disabled', 'disabled'); // show, but disable until craft starts hovering

                // Enable RTL when craft is hovering, this is the first mode the craft will enter
                // after its auto program is finished so we can use it as an indicator that craft is ready
                // for manual user control.
                this.model.platform.on('mode:hover', function() {
                    this.$el.find('button.home').attr('disabled', false);
                }, this);

                // Enable altitude control & fly to point.
                // TODO GH#134, these should only really be enabled when we know
                // that the system is in flight.
                this.enableAltitudeSlider();
                this.enableFlyToPoint();

                // Send a growl notification to all other connected clients
                app.socket.emit("launching");

            }, this));
        },

        render: function() {
            try {
                if (false === this.hasRendered) {
                    this.renderLayout();
                    this.hasRendered = true;
                }

                // Regenerate GUI state from operator/platform status
                this.model.platform.confirmHaveGpsFix().then(this.regenerateGuiState);

            } catch(e) {
                console.log(e);
            }
            return this;
        },

        regenerateGuiState: function() {

            // Default state should show/hide controls and disable UI interactions.
            this.showControls();
            this.altitudeWidget.disable();
            this.unbindFlyToPoint();

            this.model.platform.isFlying().then(_.bind(function(ifFlying) {
                if(false === ifFlying) return;

                if(this.model.platform.isRtl()) {
                    // show stop button
                    this.showButton('stop');
                } else if (
                    this.model.platform.isInUserControllableFlight()
                    || true // see below for why
                    ) {
                    // Show the RTL button, enable flight controls.  The reason we explicitly check for known flight
                    // states, then proceed to ignore the comparison with an || true, is because
                    // there may be other states that the craft can get into that aren't expected
                    // and we want to be reasonably sure we're giving the user a sane option.
                    // Having RTL is that sane option, and should give the user
                    // a clear exit back to GCS control.
                    this.showButton('home');
                    this.enableAltitudeSlider();
                    this.enableFlyToPoint();
                }
            }, this));

        },

        flyToPoint: function(e) {
            this.targetMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(this.mapWidget.map);
            $.get('/drone/flyToPoint', { lat: e.latlng.lat, lng: e.latlng.lng });
            this.targetLine = L.polyline(
                [
                    L.latLng(e.latlng.lat, e.latlng.lng),
                    L.latLng(
                        this.model.platform.get('lat'),
                        this.model.platform.get('lon')
                    )
                ],
                {
                    color: 'red'
                }
            ).addTo(this.mapWidget.map);
        },

        hoverAtPoint: function(e) {
            $.get('/drone/loiter');
            this.mapWidget.map.removeLayer(this.targetMarker);
            this.mapWidget.map.removeLayer(this.targetLine);
        },

        bindFlyToPoint: function() {
            if( false === this.mapEventsAreBound && true === this.model.isOperator ) {
                this.mapWidget.map.on('mousedown', this.flyToPoint, this);
                this.mapWidget.map.on('contextmenu', this.flyToPoint, this);
                this.mapWidget.map.on('mouseup', this.hoverAtPoint, this);
                this.mapEventsAreBound = true;
            }
        },

        unbindFlyToPoint: function() {
            this.mapWidget.map.off('mousedown', this.flyToPoint);
            this.mapWidget.map.off('contextmenu', this.flyToPoint);
            this.mapWidget.map.off('mouseup', this.hoverAtPoint);
            this.mapEventsAreBound = false;
        },

        bindAltitudeSliderEvents: function() {

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
                $.get('/drone/loiter');
                this.altitudeWidget.suspendSliderRender = false;
                this.altitudeWidget.render();
            }, this));

        },

        // Meant to be run only once; renders scaffolding and subviews.
        renderLayout: function() {

            // Render scaffolding
            this.$el.html(this.template);

            // Only render actual fly view once we've got GPS fix.
            this.model.platform.confirmHaveGpsFix().then(_.bind(function() {
                this.$el.find('#waitForGps').hide();
                this.$el.find('#widgets').show();
                this.renderWidgets();
                this.showControls(); // show or hide button depending on user role
                this.bindGrowlNotifications();
            }, this));

        },

        renderWidgets: function() {

            // Instantiate subviews, now that their elements are present on the page
            // GOTCHA: when instantiated, these hook up some event-based binding
            // callbacks to the underlying model.  So even though the GUI may not be
            // fully built, it's possible for them to fire render() events that will mess
            // things up.  Wait until we have GPS fix so we can do this in an orderly fashion.
            this.speedWidget = new SpeedWidget({
                model: this.model.platform
            });

            this.altitudeWidget = new AltitudeWidget({
                model: this.model.platform,
                maxAltitude: this.model.planning.get('maxAltitude')
            });

            this.batteryWidget = new BatteryWidget({
                model: this.model.platform
            });

            this.mapWidget = new MapWidget({
                model: this.model.platform
            });

            this.platformWidget = new PlatformWidget({
                model: this.model.platform
            });

            // Render party
            this.speedWidget.render();
            this.altitudeWidget.render();
            this.batteryWidget.render();
            this.mapWidget.render();
            this.bindAltitudeSliderEvents();

            try {
                // Must configure/render this only after the map has been rendered.
                this.platformWidget.map = this.mapWidget.map;
                this.platformWidget.render();
            } catch(e) {
                console.log(e);
                console.log(e.stack);
            }
        },

        // Hook up various growl notifications.
        bindGrowlNotifications: function() {
            this.model.platform.on('status:standby', function() {
                app.growl('System is in standby mode.', 'success', 10000);
            }, this);

            this.model.platform.on('disarmed', function() {
                app.growl('System is now disarmed.', 'success', 10000);
            }, this);

            this.model.connection.on('change:notification', function() {

                var message, type;
                switch(this.model.connection.get('notification')) {
                    case 'lost': message = '<span class="glyphicon glyphicon-signal"></span> Connection lost, trying to reconnect&hellip;', type='warning'; break;
                    case 'regained': message = '<span class="glyphicon glyphicon-signal"></span> Connection restored.', type='success'; break;
                    default: message = 'Connection notification not understood: ' + this.model.connection.get('notification'), type='danger'; break;
                }

                app.growl(message);

            }, this);

            // Bind notifications to change events on the platform
            this.model.platform.on('change:custom_mode', function() {
                var message, type='info', delay = 6000, mode = this.model.platform.get('custom_mode');
                switch(mode) {
                    case 0: message = "System is in stabilize mode."; break;
                    case 3: message = "Performing takeoff&hellip;"; break;
                    case 4: message = "Flying to location&hellip;"; break;
                    case 5: message = "Hovering until further notice."; break;
                    case 6: message = "Flying home and landing&hellip;", delay=10000, type='warning'; break;
                    default: message = "Switching to custom_mode " + mode, delay=10000, type='danger';
                }

                app.growl(message, type, delay);

            }, this);

            // Battery notifications
            var batteryIcon = '<span class="glyphicon glyphicon-flash"></span>';
            this.model.platform.once('battery:half', function() {
                app.growl(batteryIcon + ' Battery is at half power.');
            }, this);
            this.model.platform.once('battery:quarter', function() {
                app.growl(
                    batteryIcon + ' Battery is at quarter power.',
                    'warning',
                    1000000000 // persistent
                );
            }, this);
            this.model.platform.once('battery:low', function() {
                app.growl(
                    batteryIcon + ' Battery is very low, land safely immediately.',
                    'danger',
                    1000000000
                );
            }, this);

            // GPS notifications
            var gpsIcon = '<span class="glyphicon glyphicon-map-marker"></span>';
            this.model.platform.on('gps:fix_established', function(){
                app.growl(gpsIcon + ' GPS fix established', 'info');
            }, this);
            this.model.platform.on('gps:fix_lost', function(){
                app.growl(gpsIcon + ' GPS fix lost', 'warning');
            }, this);

        }

    });

    return FreeFlightFlyView;

});
