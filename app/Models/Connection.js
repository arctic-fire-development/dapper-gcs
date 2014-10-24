define(['backbone'], function(Backbone) {

    var Connection = Backbone.Model.extend({

        defaults: {
            notification: undefined,
            status: 'disconnected',
            time_since_last_heartbeat: 0
        }

    });

    return Connection;

});
