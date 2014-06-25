/*
 * Placeholder to contain routes to get them out of the main server.
 */

exports.index = function(req, res) {
    res.render('index', {
        title: 'DapperGCS',
        platforms: req.app.get('platforms')
    });
};


// Shim to grab platform info async.
app.get('/platforms', function(req, res) {
  res.json(platforms);
});

// Needs more logic to gracefully handle "lost" connections/discconected serial port, etc.
// Also need a /stop method.
app.get('/connection/start', function(req, res) {
    uavConnectionManager.start();
    res.send(204);
});

// Separated out for reuse if needed.
function loadParameters(parameters) {
    
    var promises = [];

    _.each(parameters, function(e) {
        promises.push(mavParams.set(e[0], e[1]));
    });

    return promises;

}

// Needs to be extended to load parameters dynamically based on drone.
app.get('/drone/params/load', function(req, res) {
    logger.info('loading parameters for SITL Copter...');
    promises = loadParameters(platforms[1].parameters);

    Q.allSettled(promises).then(function(results) {
        res.send(200);
    }); 

});




app.get('/drone/mission/load', function(req, res) {

    var mm = new MavMission(mavlink, mavlinkParser, uavConnectionManager, logger);
    var promise = mm.loadMission();
    
    Q.when(promise, function() {
        res.send(200);
    });
});

var quad = new quadUdl(logger, nconf);
quad.setProtocol(mavlinkParser);

app.get('/drone/fly', function(req, res) {

  logger.debug('launching freeflight mission');

  try {

  Q.fcall(quad.arm)
    .then(quad.setAutoMode)
    .then(quad.takeoff)
    .then(function() {
      res.send(200);
    })
    .done();

  } catch(e) {
    logger.error('error caught in server:freeglight:launch:trycatch', e)
  }
});

app.get('/drone/flyToPoint', function(req, res) {

  var lat = parseFloat(req.query.lat);
  var lng = parseFloat(req.query.lng);
  logger.info('Flying to %d %d', lat, lng);
  quad.flyToPoint(lat, lng, platform);

});

app.get('/drone/changeAltitude', function(req, res) {

  var alt = parseInt(req.query.alt);
  logger.info('Changing altitude to %d', alt);
  quad.changeAltitude(alt, platform);
  res.send(200);

});