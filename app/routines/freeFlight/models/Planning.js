define(['backbone'], function(Backbone) {

    var Planning = Backbone.Model.extend({
      urlRoot: '/routines/freeFlight/planning',
      defaults: {
        maxSpeed: 10, // kph
        maxAltitude: 120 // meters
      }
    });
    return Planning;

});