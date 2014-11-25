define(['backbone'], function(Backbone) {

    var Path = Backbone.Model.extend({

        defaults: {
            // Will be managed by Leaflet.freeDraw
            latLngs: undefined
        }

    });

    return Path;

});
