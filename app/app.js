define([
    // Libraries.
    "jquery",
    "underscore",
    "backbone",
    "io"
], function($, _, Backbone, io) {

    // Create master socket.io instance
    var socket = io();

    // TODO GH#180 Wrap this up in a debugging context flag
    // It defines the log level of socket.io.  Consider using same library for our own code?
    localStorage.debug='*';

    // Provide a global location to place configuration settings and module
    // creation.
    var app = {
        // The root path to run the application.
        root: "/",
        socket: socket
    };

    // Mix Backbone.Events, modules, and layout management into the app object.
    return app;

});