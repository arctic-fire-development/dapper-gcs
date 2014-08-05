require = require || requirejs;

// Set the require.js configuration for your application.
require.config({
    deps: [
        "main"
    ],
    paths: {
        jade: "assets/bower/jade/runtime",
        JST: "../build/templates",
        backbone: "assets/bower/backbone/backbone",
        io: "assets/bower/socket.io-client/socket.io",
        jquery: "assets/bower/jquery/dist/jquery",
        underscore: "assets/bower/underscore/underscore",
        "leaflet-dist": "assets/bower/leaflet-dist/leaflet",
        "leaflet-bing-plugin": "assets/bower/leaflet-plugins/layer/tile/Bing",
        requirejs: "assets/bower/requirejs/require",
        q: "assets/bower/q/q",
        "bootstrap-slider": "../assets/js/libs/bootstrap-slider/js/bootstrap-slider",
        bootstrapValidator: "assets/bower/bootstrapValidator/dist/js/bootstrapValidator",
        "bootstrap-growl": "assets/bower/bootstrap-growl/jquery.bootstrap-growl",
        routefilter: "assets/bower/routefilter/dist/backbone.routefilter.min",
        bootstrap: "assets/bower/bootstrap/dist/js/bootstrap"
    },
    shim: {
        backbone: {
            deps: [
                "underscore",
                "jquery"
            ],
            exports: "Backbone"
        },
        "leaflet-dist": {
            exports: "L"
        }
    }
});
