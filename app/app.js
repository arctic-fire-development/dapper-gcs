define([
    // Libraries.
    "jquery",
    "underscore",
    "backbone",
    "io",
    "bootstrap-growl"
], function($, _, Backbone, io, BS) {

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

            type = type || 'info';
            delay = delay || 6000; // ms

            $.bootstrapGrowl(message, {
                ele: 'body', // which element to append to
                type: type, // (null, 'info', 'danger', 'success')
                offset: {from: 'bottom', amount: 20}, // 'top', or 'bottom'
                align: 'right', // ('left', 'right', or 'center')
                width: 250, // (integer, or 'auto')
                delay: delay, // Time while the message will be displayed. It's not equivalent to the *demo* timeOut!
                allow_dismiss: true, // If true then will display a cross to close the popup.
                stackup_spacing: 10 // spacing between consecutively stacked growls.
            });

        }
    };

    // Mix Backbone.Events, modules, and layout management into the app object.
    return app;

});