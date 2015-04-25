'use strict';
/*globals define */

define(['jquery', 'backbone', 'underscore', 'io', 'JST', 'app', 'Models/Connection'], function($, Backbone, _, io, templates, app, Connection) {

    // Hack!  Just to get this in place.
    var mavlink = {};
    mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED = 1; // 0b00000001 Reserved for future use.
    mavlink.MAV_MODE_FLAG_TEST_ENABLED = 2; // 0b00000010 system has a test mode enabled. This flag is intended for
    // temporary system tests and should not be
    // used for stable implementations.
    mavlink.MAV_MODE_FLAG_AUTO_ENABLED = 4; // 0b00000100 autonomous mode enabled, system finds its own goal
    // positions. Guided flag can be set or not,
    // depends on the actual implementation.
    mavlink.MAV_MODE_FLAG_GUIDED_ENABLED = 8; // 0b00001000 guided mode enabled, system flies MISSIONs / mission items.
    mavlink.MAV_MODE_FLAG_STABILIZE_ENABLED = 16; // 0b00010000 system stabilizes electronically its attitude (and
    // optionally position). It needs however
    // further control inputs to move around.
    mavlink.MAV_MODE_FLAG_HIL_ENABLED = 32; // 0b00100000 hardware in the loop simulation. All motors / actuators are
    // blocked, but internal software is full
    // operational.
    mavlink.MAV_MODE_FLAG_MANUAL_INPUT_ENABLED = 64; // 0b01000000 remote control input is enabled.
    mavlink.MAV_MODE_FLAG_SAFETY_ARMED = 128; // 0b10000000 MAV safety set to armed. Motors are enabled / running / can
    // start. Ready to fly.

    var EngineeringView = Backbone.View.extend({

        el: '#engineering',
        template: templates['app/Templates/Engineering'],

        initialize: function() {
            _.bindAll(this, 'render', 'updatePlatform', 'updateConnection');
            this.listenTo(this.model, 'change', this.render);
            this.connection = new Connection();
            this.listenTo(this.connection, 'change', this.render);
            this.startConnection();
        },
        startConnection: function() {
            app.socket.emit('startConnection');
            app.socket.on('platform', this.updatePlatform);
            app.socket.on('linkStatus', this.updateConnection);
        },

        updatePlatform: function(platformData) {
            this.model.set(platformData);
        },

        updateConnection: function(connectionData) {
            this.connection.set(connectionData);
        },

        render: function() {
            var has;
            if (has) return false;
            has = true;
            var mode, manual, armed = '';
            if (this.model.get('base_mode') & mavlink.MAV_MODE_FLAG_AUTO_ENABLED) {
                mode = "auto";
            }
            if (this.model.get('base_mode') & mavlink.MAV_MODE_FLAG_GUIDED_ENABLED) {
                mode = "guided";
            }
            if (this.model.get('base_mode') & mavlink.MAV_MODE_FLAG_STABILIZE_ENABLED) {
                mode = "stabilize";
            }
            if (this.model.get('base_mode') & mavlink.MAV_MODE_FLAG_MANUAL_INPUT_ENABLED) {
                manual = ""; // this is normally the case, ignore it
            } else {
                manual = "manual mode disabled&#8253;";
            }
            if (this.model.get('base_mode') & mavlink.MAV_MODE_FLAG_SAFETY_ARMED) {
                armed = "armed";
            } else {
                armed += "disarmed";
            }

            // Render scaffolding, filling in the gaps as provided
            this.$el.html(this.template(_.extend(this.model.toJSON(), {
                voltage_battery: this.model.get('voltage_battery').toFixed(2),
                current_battery: this.model.get('current_battery').toFixed(2),
                time_since_last_heartbeat: this.connection.get('time_since_last_heartbeat')
            })));


            $('#modeSummary').html(_.template(
                '<span class="mode <%= mode %>"><%= mode %></span> <%= manual %> <span class="<%= armed %>"><%= armed %></span>', {
                    mode: mode,
                    manual: manual,
                    armed: armed
                }
            ));

            return this;
        }

    });

    return EngineeringView;

});
