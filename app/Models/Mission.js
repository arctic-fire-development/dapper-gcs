define(['backbone'], function(Backbone) {

    var Mission = Backbone.Model.extend({
      defaults: {
        platformId: 0,
        payload: '',
        mission: 'freeFlight'
      }
    });
    return Mission;

});