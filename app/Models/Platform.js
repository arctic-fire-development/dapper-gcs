define(['backbone', 'underscore'], function(Backbone, _) {

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
            vx: undefined,
            vy: undefined,
            vz: undefined,
            hdg: undefined,

            // Set by mavlink.gps_raw_int packets
            fix_type: undefined,
            satellites_visible: undefined,

            // set by mavlink.attitude packets
            pitch: undefined,
            roll: undefined,
            yaw: undefined,
            pitchspeed: undefined, // acceleration
            rollspeed: undefined, // acceleration
            yawspeed: undefined, // acceleration

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
            battery_remaining: undefined,
            drop_rate_comm: undefined,
            errors_comm: undefined,

            // Set by mavlink.vfr_hud packets
            airspeed: undefined,
            groundspeed: 0,
            heading: undefined,
            throttle: undefined,
            climb: undefined
*/

        },

        initialize: function() {
            _.bindAll(this, 'set');
            this.on('change:fix_type', function() {
                if(this.hasGpsFix()) {
                    this.trigger('gps:fix_established');
                }
            }, this);
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
            alt = parseInt(Number(alt).toFixed(0));
            return alt;
        },

        // We have a GPS fix if we have lat, lon, and a known good fix_type.
        // This may not be a complete set of criteria, but it's close.
        hasGpsFix: function() {
            return (
                this.get('fix_type') >= 2 // 2 + greater means has x/y fix.  See MAVLink spec for this, GPS_RAW_INT
                && _.isNumber(this.get('lat'))
                && _.isNumber(this.get('lon'))
            );
        }

    });

    return Platform;

});