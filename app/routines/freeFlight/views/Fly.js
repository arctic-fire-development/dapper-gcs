define(['backbone', 'JST', 'q',

    // Models
    'Models/Mission',

    // Widgets (subviews)
    'Views/Widgets/Speed',
    'Views/Widgets/Map',
    'Views/Widgets/Altitude',

], function(Backbone, templates, Q,
    // Models
    Mission,

    // Widgets (subviews)
    SpeedWidget,
    MapWidget,
    AltitudeWidget
) {

    var SitlFlyView = Backbone.View.extend({

        model: Mission,
        el: '#fly',
        template: templates['app/routines/freeFlight/Templates/missionLayout'],
        hasRendered: false,

        events: {
            'click #launch' : 'launch'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'renderLayout');
        },

        launch: function() {
            console.log('launching!');
            Q($.get('/plugins/freeFlight/mission/launch')).then(_.bind(function(data) {
                console.log('launched');
            }, function(xhr) {
                // on failure?
                console.log(xhr);
            }, this));
        },

        render: function() {
            try {
                if (false === this.hasRendered) {
                    this.renderLayout();
                }
            } catch(e) {
                console.log(e);
            }
        },

        // Meant to be run only once; renders scaffolding and subviews.
        renderLayout: function() {

            // Render scaffolding
            this.$el.html(this.template);

            // Instantiate subviews, now that their elements are present on the page
            this.speedWidget = new SpeedWidget({
                model: this.model.get('platform')
            });
            this.mapWidget = new MapWidget({
                model: this.model.get('platform')
            });
            this.altitudeWidget = new AltitudeWidget({
                model: this.model.get('platform')
            });

            // Render party
            this.speedWidget.render();
            this.mapWidget.render();
            this.altitudeWidget.render();
            
             this.mapWidget.map.on('click', function(e) {
                
                $.get('/plugins/freeFlight/mission/flyToPoint', { lat: e.latlng.lat, lng: e.latlng.lng });
                
            });

        }

    });

    return SitlFlyView;

});