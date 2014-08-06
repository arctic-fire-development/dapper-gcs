define(['backbone', 'underscore', 'q'], function(Backbone, _, Q) {

    var Platform = Backbone.Model.extend({

        defaults: {

/*
We leave all items undefined and require that the client code using this model enforce its own handling.
This is because the defaults are _unknown_ until they're set from real data from a UAV, and it's misleading
to assign them defaults.

For convenience/reference, items that will be set/used by client code are enumerated below, with references back to
the MAVLink messages that set them.

            // Set by mavlink.global_position_int packets
            lat: undefined,
            lon: undefined,
            alt: undefined,
            relative_alt: undefined,

            // Set by mavlink.gps_raw_int packets
            fix_type: undefined,
            satellites_visible: undefined,

            // TODO GH#147
            // Set by mavFlightMode interpreting a variety of packets
            stateMode: undefined,
            stateAuto: undefined,
            stateGuided: undefined,
            stateStabilize: undefined,
            stateManual: undefined,
            stateArmed: undefined,

            // Set by mavlink.SYS_STATUS packets
            voltage_battery: undefined,
            current_battery: undefined,
            battery_remaining: undefined, // %remaining

            // Set by mavlink.vfr_hud packets
            groundspeed: 0,
            heading: undefined,
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
                if(this.hasGpsFix()) {
                    this.trigger('gps:fix_established');
                } else{
                    this.trigger('gps:fix_lost');
                }
            }, this);

            // Managed armed/disarmed, and set home location too.
            this.on('change:base_mode', function() {
                // GH#122.  Replace 128 with an abstraction to the appropriate mavlink mapping.
                if(128 & this.get('base_mode')) {
                    this.set({
                        homeLat: this.get('lat'),
                        homeLon: this.get('lon')
                    });
                    this.trigger('armed');
                } else {
                    this.trigger('disarmed');
                }
            }, this);

            this.on('change:custom_mode', function() {
                this.trigger('custom_mode');
                // Again GH#122.
                if(5 == this.get('custom_mode')) { // Loiter mode.
                    this.trigger('mode:hover');
                }
            }, this);

            this.on('change:system_status', function() {
                var status;
                // TODO: See GH#122 and MAV_STATE enum.
                switch(this.get('system_status')) {
                    case 1: status = 'booting'; break;
                    case 2: status = 'calibrating'; break;
                    case 3: status = 'standby'; break;
                    case 4: status = 'active'; break;
                    case 5: status = 'critical'; break;
                    case 6: status = 'emergency'; break;
                    case 7: status = 'shutdown'; break;
                    default: status = 'unknown'; break;
                }
                this.trigger('status:'+status);
            }, this);
            this.on('change:battery_remaining', function() {
                if(this.get('battery_remaining') <= 10) {
                    this.trigger('battery:low');
                } else if(this.get('battery_remaining') <= 25) {
                    this.trigger('battery:quarter');
                } else if(this.get('battery_remaining') <= 50) {
                    this.trigger('battery:half');
                }
            }, this);
        },

        // A few convenience methods to help the GUI decide what to do.
        // See GH#122.
        // The intent of this one is to answer, "Is the craft in a mode where it's flying
        // and the user is likely to interact with it?"
        isInUserControllableFlight: function() {
            if(
                this.get('custom_mode') === 4 // Guided mode
                || this.get('custom_mode') === 5 // Loiter mode
            ) {
                return true;
            }
            return false;
        },
        // GH#122
        isRtl: function() {
            if( this.get('custom_mode') === 6) { // RTL mode
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

        cleanup: function(attrs) {

            if('relative_alt' in attrs) {
                attrs.relative_alt = this.parseAltitude(attrs.relative_alt);
            }

            if('alt' in attrs) {
                attrs.alt = this.parseAltitude(attrs.alt);
            }

        },

        // Force altitude to be an integer.  Used for both alt and relative_alt.
        parseAltitude: function(alt) {
            alt = parseFloat(alt);

            // If we don't have a real value, keep it undefined instead of getting stuck with NaN.
            if(_.isNaN(alt)) { return undefined; }

            if(alt < 0) {
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
            return (
                this.get('fix_type') >= 2 // 2 + greater means has x/y fix.  See MAVLink spec for this, GPS_RAW_INT
                && _.isNumber(this.get('lat')) && this.get('lat') != 0
                && _.isNumber(this.get('lon')) && this.get('lon') != 0
            );
        },


        // Promised-based function for handling when we get a GPS fix.
        confirmHaveGpsFix: function() {
            var deferred = Q.defer();

            // Return immediately if we do presently have GPS fix.
            if( true === this.hasGpsFix()) {
                deferred.resolve();
            }

            var checkGps = _.bind(function() {
                if(true === this.hasGpsFix()) {
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
                if( this.get('system_status') == 4 && this.get('relative_alt') > 1 ) {
                    clearInterval(interval);
                    deferred.resolve(true); // yep, flying as best we can tell
                } else if (
                    'undefined' !== typeof(this.get('system_status'))
                    && 'undefined' !== typeof(this.get('relative_alt'))
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
