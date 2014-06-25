var mavlink = require("mavlink_ardupilotmega_v1.0"),
    UavConnection = require("./assets/js/libs/uavConnection.js"),
    MavParams = require("./assets/js/libs/mavParam.js"),
    express = require('express'),
    csv = require('csv'),
    routes = require('./routes'),
    app = express(),
    http = require('http'),
    nowjs = require("now"),
    path = require('path'),
    nconf = require("nconf"),
    requirejs = require("requirejs"),
    winston = require("winston"),
    Q = require('q'),
    MavFlightMode = require("./assets/js/libs/mavFlightMode.js"),
    MavMission = require('./assets/js/libs/mavMission.js'),
    quadUdl = require("./assets/js/libs/udlImplementations/quadcopter.js"),
    planeUdl = require("./assets/js/libs/udlImplementations/plane.js"),
    platforms = require("./assets/js/libs/platforms.js");

requirejs.config({
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    baseUrl: './app'
});

// Configure Winston
var logger = module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: process.env.GCS_LOG_LEVEL // if undefined, will be 'info'.
    })
  ]
});
logger.setLevels(winston.config.npm.levels);

// Fetch configuration information.
nconf.argv().env().file({
    file: 'config.json'
});

app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.set('platforms', platforms);

// Only one route which kicks off the client Bootstrap app.
app.get('/', routes.index);

// Catchall/redirect for routes not otherwise handled, go home.
app.use(function(req, res){
    logger.debug('unhandled request', req.path);
    res.redirect('/');
});

// We need to take care with syntax when using Express 3.x and Socket.io.
// https://github.com/Flotype/now/issues/200
var server = http.createServer(app).listen(app.get('port'), function() {
    logger.info('Express server listening on port ' + app.get('port'));
});
