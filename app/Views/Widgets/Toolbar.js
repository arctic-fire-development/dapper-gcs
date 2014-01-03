define(['backbone', 'JST', 'jqueryToolbar'], function(Backbone, template, toolbar) {

  var ToolbarWidget = Backbone.View.extend({

    el: '#toolbarWidget',
    template: template['app/Templates/toolbarWidget'],

    initialize: function() {
      _.bindAll(this);
    },

    render: function() {
        this.$el.html(this.template());

        $('.toolbar-icons a').on('click', function( event ) {
            event.preventDefault();
        });

        $('#settingsUser').toolbar({
            content: '#user-toolbar-options',
            position: 'right'
        });


    }

  });
  return ToolbarWidget;

});