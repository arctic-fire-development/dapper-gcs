'use strict';
/*global require, module, process, __dirname, console */
var mavlink = require('mavlink_ardupilotmega_v1.0'),
    UavConnection = require('./assets/js/libs/uavConnection.js'),
    MavParams = require('./assets/js/libs/mavParam.js'),
    express = require('express'),
    routes = require('./routes'),
    app = express(),
    http = require('http'),
    path = require('path'),
    nconf = require('nconf'),
    requirejs = require('requirejs'),
    winston = require('winston'),
    gcsLogConfig = require('./assets/js/libs/customLogLevels.js'),
    Q = require('q'),
    server = http.createServer(app),
    io = require('socket.io')(server),
    fs = require('fs'),
    MavMission = require('./assets/js/libs/mavMission.js'),
    quadUdl = require('./assets/js/libs/udlImplementations/ArduCopter.js'),
    APM = require('./assets/js/libs/udlImplementations/ArduCopter.js').APM,
    platforms = require('./assets/js/libs/platforms.js'),
    _ = require('underscore'),
    Users = require('./assets/js/libs/Users.js'),
    RoutineObj = require('./assets/js/libs/Routine.js'),
    Platform = require('./Models/Platform.js');

requirejs.config({
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    baseUrl: './app'
});

// Configure Winston
var logger = module.exports = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            colorize: true,
            timestamp: true,
            level: process.env.GCS_LOG_LEVEL // if undefined, will be 'info'.
        })
    ],
    levels: gcsLogConfig.levels,
    colors: gcsLogConfig.colors
});

// Fetch configuration information.
nconf.argv()
    .env()
    .file({
        file: 'config.json'
    });

// The logging path is created here if not already present;
// do this synchronously to ensure creation before opening log streams.
try {
    fs.statSync(nconf.get('logging:root'));
} catch (err) {
    logger.verbose('Creating logfile directory %s', nconf.get('logging:root'));
    try {
        if ('ENOENT' == err.code) {
            fs.mkdirSync(err.path);
        }
    } catch (e) {
        // Genuine unknown error occurred.
        logger.error(e);
        throw (e);
    }
}

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

// Shunt client configs into place.  Rendered in the route.  Not ideal (#122)
app.set('platforms', platforms);
app.set('config', nconf);
app.set('APM', APM);

// Only one route which kicks off the client Bootstrap app.
app.get('/', routes.index);
app.get('/checklist', routes.checklist);
app.get('/unsupported', routes.unsupported);

// Catchall/redirect for routes not otherwise handled, go home.
app.use(function(req, res) {
    logger.debug('unhandled request', req.path);
    res.redirect('/');
});

server.listen(app.get('port'), function() {
    logger.info('Express server listening on port ' + app.get('port'));
});

// Establish parser
var mavlinkParser = new mavlink(logger);

// Connection to UAV.  Started/stopped by client.
var uavConnectionManager = new UavConnection.UavConnection(nconf, mavlinkParser, logger);
mavlinkParser.setConnection(uavConnectionManager);

// MavParams are for handling loading parameters
var mavParams = new MavParams(mavlinkParser, logger);
app.set('mavParams', mavParams);

var platform = {},
    connection = {},
    serverPlatform = new Platform();

serverPlatform.on('change', function(){
    io.emit('serverPlatform', serverPlatform.toJSON());
    //console.log(util.inspect(serverPlatform.toJSON()));
});

serverPlatform.on('all', function(eventName){
    if ('change' !== eventName){
        logger.info('serverPlatform event triggered: ', eventName);
    }
});

serverPlatform.io = io;

var routine = new RoutineObj(logger, app, io);
var users = new Users(logger, io);

io.on('connection', function(socket) {
    socket.on('startConnection', function() {

        if (false === uavConnectionManager.hasStarted()) {
            uavConnectionManager.start();
            bindClientEventBridge();
        } // end if-connection-manager-has-started
    });
});

app.get('/connection/start', function(req, res) {
    uavConnectionManager.start();
    res.send(204);
});

/***************
Start of code to handle droneUDL REST API and plugin-specific hacked-starting code.
***************/

var quad = new quadUdl(logger, nconf);
quad.setProtocol(mavlinkParser);

// Very hacky code below, the point of which is to get a 'current routine' hacked in place on the server side,
// which the client will be configuring as part of new-routine/planning/preflight stuff.
// This should evolve into a single strong session-based model of some kind, with DB persistence.
// See GH#119.
// Anything referencing 'routine' falls into this bucket.

app.get('/drone/params/load', function(req, res) {

    logger.info('loading parameters for SITL Copter...');

    // TODO hardcoded platform D:
    var promises = mavParams.loadParameters(platforms[0].parameters);

    // Hack/hardcoding interactive parameter setting
    // GH#164
    // stored on gcs as m/s, send over mavlink as cm/s
    promises.push(mavParams.set('WPNAV_SPEED', routine.mission.get('maxSpeed') * 100));

    // Fence seems to be enabled by default on Iris to 100m, so,
    // let's just be sure and do that with whatever the user has specified too.
    promises.push(mavParams.set('FENCE_TYPE', 1)); // altitude-only fence
    promises.push(mavParams.set('FENCE_ALT_MAX', routine.mission.get('maxAltitude')));

    // There's four different failsafes and we may want
    // to treat them differently (and each has its own slight
    // different in choices of actions to take) but I think the user's
    // perspective is normally going to be "either RTL" or
    // "ignore" (i.e. safe, or danger, not some illusion of finessed
    // control somewhere in-between!)
    // If GPS is lost, best we can do is either land in place (no) or
    // alt-hold (better choice here I think).
    // Also this code needs to get out of server.js, GH#294
    switch (routine.mission.get('failsafeBehavior')) {
        case 'ignore':
            promises.push(mavParams.set('FS_BATT_ENABLE', 0)); //disable failsafe
            promises.push(mavParams.set('FS_GCS_ENABLE', 0)); //disable failsafe
            promises.push(mavParams.set('FS_GPS_ENABLE', 0)); //disable failsafe
            break;

        case 'rtl': // fallthru
        default: // default to safe choices
            promises.push(mavParams.set('FS_BATT_ENABLE', 2)); //rtl if battery low
            promises.push(mavParams.set('FS_GCS_ENABLE', 1)); //rtl if no heartbeat from GCS
            promises.push(mavParams.set('FS_GPS_ENABLE', 1)); //ALT HOLD if GPS lost.
            break;
    }

    Q.allSettled(promises)
        .then(
            function() {
                res.send(200);
            },
            function(failed) {
                logger.error(failed);
                res.sent(500);
            }
        );

});

// TODO GH#164
// This code is a prototype for when we properly bind this into the client GUI.
app.get('/drone/mission/load', function(req, res) {

    var lat = parseFloat(req.query.lat);
    var lng = parseFloat(req.query.lng);
    var mm = new MavMission(mavlink, mavlinkParser, uavConnectionManager, logger);
    var mission = mm.buildTakeoffThenHoverMission(lat, lng, routine.mission.get('takeoffAltitude'));
    var promise = mm.loadMission(mission);

    Q.when(promise, function() {
        res.send(200);
    });
});

// TODO GH#164
// This is just a stub to handle getting the home/armed location to the
// mission-build-takeoff section.
function loadTakeoffMission() {

    var deferred = Q.defer();
    var mm = new MavMission(mavlink, mavlinkParser, uavConnectionManager, logger);

    quad.getLatLon()
        .then(function(location) {
            logger.info('Building auto/hover mission from home point: ', location);
            var mission = mm.buildTakeoffThenHoverMission(location[0], location[1], routine.mission.get('takeoffAltitude'));
            mm.loadMission(mission)
                .then(function() {
                    logger.info('Auto/hover mission loaded into APM.');
                    deferred.resolve();
                })
                .fail(function(error) {
                    logger.error(error.toString());
                });
        })
        .fail(function(error) {
            logger.error(error.toString());
        });

    return deferred.promise;
}

app.get('/drone/launch', function(req, res) {

    logger.debug('launching freeflight mission');

    try {

        Q.fcall(loadTakeoffMission)
            .then(quad.setAutoMode)
            .then(quad.arm)
            .then(quad.takeoff)
            .then(function() {
                res.send(200);
            })
            .done(); // calling 'done' should rethrow any uncaught errors in the promise chain.

    } catch (e) {
        logger.error('error caught in server:freeglight:launch:trycatch', e);
    }
});

app.get('/drone/disarm', function(req, res) {
    quad.disarm()
        .then(function() {
            res.send(200);
        });
});

app.get('/drone/flyToPoint', function(req, res) {

    var lat = parseFloat(req.query.lat);
    var lng = parseFloat(req.query.lng);
    logger.info('Flying to %d %d', lat, lng);
    Q.fcall(_.bind(quad.flyToPoint, quad), lat, lng, platform)
        .then(function() {
            res.send(200);
        })
        .catch(function(error) {
            logger.error(error);
        })
        .done();

});

app.get('/drone/loiter', function(req, res) {
    logger.verbose('Setting LOITER mode...');
    Q.fcall(quad.guidedLoiter)
        .then(function() {
            res.send(200);
        })
        .catch(function(error) {
            logger.error(error);
        })
        .done();
});

app.get('/drone/changeAltitude', function(req, res) {

    var alt = parseInt(req.query.alt);

    // TODO GH#154 unsafe prototype code below; idea being, protect from sending messages that are outside
    // a GCS/GUI enforced ceiling.
    if (alt > routine.maxAltitude) {
        alt = routine.maxAltitude;
    }

    logger.info('Changing altitude to %d m', alt);
    quad.changeAltitude(alt, platform);
    res.send(200);

});

app.get('/drone/rtl', function(req, res) {
    logger.info('Setting RTL mode...');
    quad.rtl(); //missing ack
    res.send(200);
});

app.get('/platforms', function(req, res) {
    res.json(platforms);
});

// Set up exit handlers so we can clean up as best as possible upon server process shutdown
process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, err) {

    if (options.cleanup) {
        logger.debug('Closing logfiles...');
        uavConnectionManager.stopLogging();
    }

    if (err) {
        logger.error(util.inspect(err));
    }

    if (options.exit) process.exit();

    // For restarting with Nodemon
    if (options.killProcess) {
        process.kill(process.pid, 'SIGUSR2');
    }
}

// Handle when the script is being managed by nodemon
process.once('SIGUSR2', exitHandler.bind(null, {
    cleanup: true,
    killProcess: true
}));

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
    cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
    exit: true
}));

// Shunt uncaught exceptions to the log.
process.on('uncaughtException', function(error) {
    exitHandler({
        exit: false
    }, error);
});

// TODO: move this function elsewhere
function bindClientEventBridge() {
    // For performance reasons, let's hide these types of "silly" loggings behind environmental dev flags
    // TODO GH#180
    // Bind this in the same scope as the other client/server connections so we can be sure we're not
    // flooding event handlers.
    // mavlinkParser.on('message', function(m) {
    //   logger.silly('Got MAVLink message %s', m.name);
    // });

    mavlinkParser.on('GLOBAL_POSITION_INT', function(message) {
        platform = _.extend(platform, {
            lat: message.lat / 10000000,
            lon: message.lon / 10000000,
            alt: message.alt / 1000,
            relative_alt: message.relative_alt / 1000
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
    });

    // This won't scale =P still
    // But it's closer to what we want to do.
    mavlinkParser.on('HEARTBEAT', function(message) {
        platform = _.extend(platform, {
            type: message.type,
            base_mode: message.base_mode,
            custom_mode: message.custom_mode,
            system_status: message.system_status
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
        io.emit('status:custom_mode', message);
    });

    mavlinkParser.on('SYS_STATUS', function(message) {
        platform = _.extend(platform, {
            voltage_battery: message.voltage_battery / 1000, // millivolts to volts
            current_battery: message.current_battery / 100, // convert from 10*milliAmps to Amps
            battery_remaining: message.battery_remaining,
            drop_rate_comm: message.drop_rate_comm,
            errors_comm: message.errors_comm
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
    });

    mavlinkParser.on('VFR_HUD', function(message) {
        platform = _.extend(platform, {
            airspeed: message.airspeed,
            groundspeed: message.groundspeed * 2.23694, // m/s to miles/hour
            heading: message.heading
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
    });

    mavlinkParser.on('GPS_RAW_INT', function(message) {
        platform = _.extend(platform, {
            fix_type: message.fix_type,
            satellites_visible: message.satellites_visible,
            hdop: message.eph / 100 // cm to m
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
    });

    mavlinkParser.on('RADIO_STATUS', function(message) {
        platform = _.extend(platform, {
            rssi: message.rssi,
            remrssi: message.remrssi,
            rxerrors: message.rxerrors,
            rxfixed: message.fixed
        });
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('platform', platform);
    });

    mavlinkParser.on('STATUSTEXT', function(message) {
        serverPlatform.set(platform);
        serverPlatform.trigger('change');
        io.emit('STATUSTEXT', message.text);
        logger.info('status text from APM: ' + util.inspect(message.text));
    });

    uavConnectionManager.on('disconnected', function() {
        connection = _.extend(connection, {
            status: uavConnectionManager.getState(),
            time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
        });
        io.emit('linkStatus', connection);
    });

    uavConnectionManager.on('connecting', function() {
        connection = _.extend(connection, {
            status: uavConnectionManager.getState(),
            time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
        });
        io.emit('linkStatus', connection);
    });

    uavConnectionManager.on('connected', function() {
        connection = _.extend(connection, {
            status: uavConnectionManager.getState(),
            time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
        });
        io.emit('linkStatus', connection);
    });

    uavConnectionManager.on('connection:lost', function() {
        connection = _.extend(connection, {
            notification: 'lost'
        });
        io.emit('linkStatus', connection);
        logger.debug('lost comms, platform.rssi: ' + platform.rssi);

    });

    uavConnectionManager.on('connection:regained', function() {
        connection = _.extend(connection, {
            notification: 'regained'
        });
        io.emit('linkStatus', connection);
        logger.debug('regained lost comms, platform.rssi: ' + platform.rssi);
    });

    uavConnectionManager.on('heartbeat', function() {
        connection = _.extend(connection, {
            status: uavConnectionManager.getState(),
            time_since_last_heartbeat: (uavConnectionManager.getTimeSinceLastHeartbeat() / 1000).toFixed(2)
        });
        io.emit('linkStatus', connection);
    });
}
