define([
    // Libraries.
    "jquery",
    "underscore",
    "backbone",
    "io",
    "modernizr",
    "bootstrap-growl",
    "moment"
], function($, _, Backbone, io, Modernizr, BS, moment) {

    // Modernizr doesn't export via Requirejs, so we just reference it from the window object.
    var Modernizr = window.Modernizr;

    // Test for some required features to continue running the local app.
    // Just check for falsy.
    if(false == Modernizr.localstorage
        || false == Modernizr.websockets) {
        window.location = '/unsupported';
    }

    // Create master socket.io instance
    var socket = io();

    // TODO GH#180 Wrap this up in a debugging context flag
    // It defines the log level of socket.io.  Consider using same library for our own code?
    localStorage.debug='';

    // Provide a global location to place configuration settings and module
    // creation.
    var app = {
        // The root path to run the application.
        root: "/",
        socket: socket,

        growl: function(message, type, delay) {
            message = '<div class="growl_ts">' + moment().format('h:mm:ss') + '</div><div>' + message + '</div>';
            type = type || 'info';
            delay = delay || 6000; // ms

            $.bootstrapGrowl(message, {
                ele: 'body', // which element to append to
                type: type, // (null, 'info', 'danger', 'success')
                offset: {from: 'top', amount: 60}, // 'top', or 'bottom'
                align: 'right', // ('left', 'right', or 'center')
                width: 250, // (integer, or 'auto')
                delay: delay, // Time while the message will be displayed. It's not equivalent to the *demo* timeOut!
                // For allow_dismiss below, see GH#193.  This is a cheap interim fix.  We'll likely need to clone/improve
                // on that library in order to address it more nicely.
                allow_dismiss: false, // If true then will display a cross to close the popup.
                stackup_spacing: 10 // spacing between consecutively stacked growls.
            });

        }
    };

    // Mix Backbone.Events, modules, and layout management into the app object.
    return app;

});
