define(['backbone', 'underscore', 'q'], function(Backbone, _, Q) {

    var Platform = Backbone.Model.extend({

        defaults: {

            /* Some properties we manage independently from what the server provides.
            These should probably be undefined, but we can enumerate them here
            whether or not that's the case. */
            armed: undefined, // boolean

            /* Some properties that _are_ populated by the UAV are safe to set to defaults.
            These go here.
            */
            voltage_battery: 0, // volts
            current_battery: 0 //amps

            /*
            We leave all items undefined and require that the client code using this model enforce its own handling.
            This is because the defaults are _unknown_ until they're set from real data from a UAV, and it's misleading
            to assign them defaults.

            For convenience/reference, items that will be set/used by client code are enumerated below, with references back to
            the MAVLink messages that set them.

            From mavlink.GLOBAL_POSITION_INT:
            These values are interpolated/smoothed, unlike the gps_raw_int below:
                lat: float [degrees]
                lon: float [degrees]
                alt: absolute altitude wrt WGS84 [meters]
                relative_alt: relative altitude from where system was armed.  how is this set, barometer? [unit ?]  GH#255

            From mavlink.GPS_RAW_INT:
                fix_type: 0, 1 = none, 2 = 2d fix, 3 = 3d fix.  Doesn't imply a _good_ positional fix.
                satellites_visible: integer, # of satellites
                eph: meters, corresponds to "hdop", horizontal dispersion of position -- basically, accuracy.  < 2 needed for GPS flight.

            From mavlink.SYS_STATUS:
                voltage_battery: [volts]
                current_battery: [Amps] note: autopilot reports this as 10*milliAmps, so must divide by 10,000 to get Amps in ?
                battery_remaining: % Remaining battery energy in percent
                drop_rate_comm: % Communication drops in percent

            From mavlink.VFR_HUD:
                groundspeed: kph
                heading: compass direction [degrees]

            From mavlink.RADIO_STATUS:
                rssi: ? units ? meaning ?
                remrssi: ? units ? meaning ?
                rxerrors: ? units ? meaning ?
                rxfixed: ? units ? meaning ?

            */

        },

        // TODO GH#122 future refactor: this code depends specifcally on APM-flavored MAVLink messages
        // being interpreted to produce client-side events.  Need to abstract this out in the same way
        // the server-side UDL stuff is done.
        // Also note the volume of event handlers being bound here, that's an emergent pattern, should
        // be considered with #122.
        initialize: function() {

            _.bindAll(this, 'set');
            this.on('change:fix_type', function() {
                if (this.hasGpsFix()) {
                    this.trigger('gps:fix_established');
                } else {
                    this.trigger('gps:fix_lost');
                }
            }, this);

            // Hook up event bindings when system is armed/disarmed
            this.on('change:armed', function() {
                if (true === this.get('armed')) {
                    this.trigger('armed');
                } else if (false === this.get('armed')) {
                    this.trigger('disarmed');
                } else {
                    throw ('System in unclear state regarding armed/disarmed!')
                }
            }, this);

            // Managed armed/disarmed, and set home location too.
            this.on('change:base_mode', function() {
                // GH#122.  Replace 128 with an abstraction to the appropriate mavlink mapping.
                if (128 & this.get('base_mode')) {
                    // This means the system is armed.  When the APM Quad arms, then it also
                    // sets its home location.
                    this.set('armed', true);
                    this.trigger('setHomePosition');
                } else {
                    this.set('armed', false);
                }
            }, this);

            this.on('change:custom_mode', function() {
                this.trigger('custom_mode');
                // Again GH#122.
                if (appConfig.APM.custom_modes.LOITER == this.get('custom_mode')) { // Loiter mode.
                    this.trigger('mode:hover');
                }
            }, this);

            this.on('change:system_status', function() {
                var status;
                // TODO: See GH#122 and MAV_STATE enum.
                switch (this.get('system_status')) {
                    case appConfig.APM.system_status.STANDBY:
                        status = 'standby';
                        break;
                    case appConfig.APM.system_status.ACTIVE:
                        status = 'active';
                        break;
                    default:
                        status = 'Unknown/unregistered system status (' + this.get('system_status') + ')';
                        break;
                }
                this.trigger('status:' + status);
            }, this);
            this.on('change:battery_remaining', function() {
                if (this.get('battery_remaining') <= 10) {
                    this.trigger('battery:low');
                } else if (this.get('battery_remaining') <= 25) {
                    this.trigger('battery:quarter');
                } else if (this.get('battery_remaining') <= 50) {
                    this.trigger('battery:half');
                }
            }, this);
        },

        // A few convenience methods to help the GUI decide what to do.
        // See GH#122.
        // The intent of this one is to answer, "Is the craft in a mode where it's flying
        // and the user is likely to interact with it?"
        isInUserControllableFlight: function() {
            if (
                this.get('custom_mode') === appConfig.APM.custom_modes.ALT_HOLD || this.get('custom_mode') === appConfig.APM.custom_modes.GUIDED || this.get('custom_mode') === appConfig.APM.custom_modes.LOITER
            ) {
                return true;
            }
            return false;
        },
        // GH#122
        isRtl: function() {
            if (this.get('custom_mode') === appConfig.APM.custom_modes.RTL) {
                return true;
            }
            return false;
        },

        // We override the set function in order to manipulate values as required when they are set.
        set: function(key, val, options) {

            // The block below is what Backbone does to handle different ways of calling Set.
            var attrs;
            if (key == null) return this;
            if (typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            // Clean up properties.   attrs is passed by reference since it's an object,
            // so properties are changed in-place by the cleanup function.
            this.cleanup(attrs);

            // Call Backbone's core set() method.
            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        // This function is used to tidy up any incoming parameters where we want all the information
        // that is available, but we don't want to display it the same way to the user (i.e. useless precision).
        cleanup: function(attrs) {

            if ('relative_alt' in attrs) {
                attrs.relative_alt = this.parseAltitude(attrs.relative_alt);
            }

            if ('alt' in attrs) {
                attrs.alt = this.parseAltitude(attrs.alt);
            }

        },

        // Force altitude to be an integer.  Used for both alt and relative_alt.
        parseAltitude: function(alt) {
            alt = parseFloat(alt);

            // If we don't have a real value, keep it undefined instead of getting stuck with NaN.
            if (_.isNaN(alt)) {
                return undefined;
            }

            if (alt < 0) {
                alt = Math.ceil(alt);
            } else {
                alt = Math.floor(alt);
            }

            return alt;
        },

        // We have a GPS fix if we have lat, lon, and a known good fix_type.
        // Also reject when both lat/lon are zero, which prevents a case where we start
        // getting values but they're set to zero (may only occur in SITL).
        // This may not be a complete set of criteria, but it's close.
        hasGpsFix: function() {
            if (appConfig.bypassGps) {
                return true;
            }
            return (
                this.get('fix_type') >= 2 // 2 + greater means has x/y fix.  See MAVLink spec for this, GPS_RAW_INT
                && _.isNumber(this.get('lat')) && this.get('lat') != 0 && _.isNumber(this.get('lon')) && this.get('lon') != 0
            );
        },


        // Promised-based function for handling when we get a GPS fix.
        confirmHaveGpsFix: function() {
            var deferred = Q.defer();

            // Return immediately if we do presently have GPS fix.
            if (true === this.hasGpsFix()) {
                deferred.resolve();
            }

            var checkGps = _.bind(function() {
                if (true === this.hasGpsFix()) {
                    clearInterval(interval);
                    deferred.resolve(true);
                }
            }, this);

            var interval = setInterval(checkGps, 200);
            return deferred.promise;
        },

        // The system is flying if it's active and relative altitude is greater than zero.
        // The second assumption -- that relative alt > 1 -- is problematic.  GH#134
        // We wait until we have defined values before answering a client, because sometimes
        // client code can query before all telemetry data is present.
        isFlying: function() {
            var deferred = Q.defer();
            var checkStatus = _.bind(function() {
                if (this.get('system_status') == 4 && this.get('relative_alt') > 1) {
                    clearInterval(interval);
                    deferred.resolve(true); // yep, flying as best we can tell
                } else if (
                    'undefined' !== typeof(this.get('system_status')) && 'undefined' !== typeof(this.get('relative_alt'))
                ) {
                    // If these values are both numbers but they don't match our criteria for flight,
                    // then let's assume not flying.
                    clearInterval(interval);
                    deferred.resolve(false);
                }
            }, this);
            var interval = setInterval(checkStatus, 200);
            return deferred.promise;
        }

    });

    return Platform;

});
