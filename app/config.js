require = require || requirejs;

// Set the require.js configuration for your application.
require.config({

    // Initialize the application with the main application file.
    deps: ["main"],

    paths: {
        // libs is for any utility libraries written for this project.
        libs: "../assets/js/libs",

        // vendor is for external, 3rd party libraries used in this project.
        vendor: "../assets/vendor",

        // Build files are generated during the build process
        build: "../build",

        // Templates.js is created during the build process, move it outside the
        // app directory so our watch task can work properly.
        JST: "Templates/templates",

        // Required Libraries.
        jquery: "../node_modules/jquery/dist/jquery",
        jqueryToolbar: "../assets/js/vendor/jquery.toolbar",
        underscore: "../node_modules/underscore/underscore",
        backbone: "../node_modules/backbone/backbone",
        jade: "../node_modules/grunt-contrib-jade/node_modules/jade/runtime",

        // Libraries where we modify the source code in one way or another
        leaflet: "../assets/js/libs/leaflet",
        now: "../assets/js/libs/now" // we just don't talk about this one.

    },

    shim: {

        underscore: {
            deps: [],
            exports: '_',
            // remove the global reference to _
            // and make it internal to RequireJS
            init: function () {
                return this._.noConflict();
            },
        },

        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone',
            // remove the global reference to Backbone
            // and make it internal to RequireJS
            init: function (jquery, underscore) {
                return this.Backbone.noConflict();
            },
        },

        leaflet: {
            exports: "L"
        }
    }

});