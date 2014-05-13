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

// Set up connections between clients/server
var everyone = nowjs.initialize(server);

// Establish parser
var mavlinkParser = new mavlink(logger);

// Connection to UAV.  Started/stopped by client.
var uavConnectionManager = new UavConnection.UavConnection(nconf, mavlinkParser, logger);
mavlinkParser.setConnection(uavConnectionManager);

var mavFlightMode = new MavFlightMode(mavlink, mavlinkParser, uavConnectionManager, logger);

// MavParams are for handling loading parameters
var mavParams = new MavParams(mavlinkParser, logger);
app.set('mavParams', mavParams);

// Client integration code, TODO refactor away to elsewhere
requirejs(["Models/Platform", "now"], function(Platform, now) {


    var platform = {};

    mavFlightMode.on('change', function() {
        platform = _.extend(platform, mavFlightMode.getState());
        //everyone.now.updatePlatform(platform);
    });

    // This won't scale =P still
    // But it's closer to what we want to do.
    // mavlinkParser.on('HEARTBEAT', function(message) {
    //     platform = _.extend(platform, {
    //         type: message.type,
    //         autopilot: message.autopilot,
    //         base_mode: message.base_mode,
    //         custom_mode: message.custom_mode,
    //         system_status: message.system_status,
    //         mavlink_version: message.mavlink_version
    //     });
    //     log.info(message);
    //     console.log('got heartbeat');

        //everyone.now.updatePlatform(platform);

        // Also update the connection status, just so it stays current on page navigations.
        //everyone.now.updateConnection(connection);

  //  });

    mavlinkParser.on('GLOBAL_POSITION_INT', function(message) {
        platform = _.extend(platform, {
            lat: message.lat / 10000000,
            lon: message.lon / 10000000,
            alt: message.alt / 1000,
            relative_alt: message.relative_alt / 1000,
            vx: message.vx / 100,
            vy: message.vy / 100,
            vz: message.vz / 100,
            hdg: message.hdg / 100
        });
        everyone.now.updatePlatform(platform);
    });

    mavlinkParser.on('SYS_STATUS', function(message) {
        platform = _.extend(platform, {
            voltage_battery: message.voltage_battery,
            current_battery: message.current_battery,
            battery_remaining: message.battery_remaining,
            drop_rate_comm: message.drop_rate_comm,
            errors_comm: message.errors_comm
        });
        everyone.now.updatePlatform(platform);
    });

    mavlinkParser.on('ATTITUDE', function(message) {
        platform = _.extend(platform, {
            pitch: message.pitch,
            roll: message.roll,
            yaw: message.yaw,
            pitchspeed: message.pitchspeed,
            rollspeed: message.rollspeed,
            yawspeed: message.yawspeed
        });
        everyone.now.updatePlatform(platform);
    });

    mavlinkParser.on('VFR_HUD', function(message) {
        platform = _.extend(platform, {
            airspeed: message.airspeed,
            groundspeed: message.groundspeed,
            heading: message.heading,
            throttle: message.throttle,
            climb: message.climb
        });
        everyone.now.updatePlatform(platform);

    });

    mavlinkParser.on('GPS_RAW_INT', function(message) {
        platform = _.extend(platform, {
            fix_type: message.fix_type,
            satellites_visible: message.satellites_visible,
            lat: message.lat / 10000000,
            lon: message.lon / 10000000,
            alt: message.alt / 1000,
            eph: message.eph,
            epv: message.epv,
            vel: message.vel,
            cog: message.cog
        });
        everyone.now.updatePlatform(platform);
    });

}); // end scope of requirejs

// Start connection management.
everyone.now.startConnection = function(ifReal) {

    if(true === ifReal) {

        uavConnectionManager.start();

        // eat error for the moment, remove this soon!
        var connection = {};

        uavConnectionManager.on('disconnected', function() {
            connection = _.extend(connection, {
                status: uavConnectionManager.getState(),
                time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
            });
            everyone.now.updateConnection(connection);
        });

        uavConnectionManager.on('connecting', function() {
            connection = _.extend(connection, {
                status: uavConnectionManager.getState(),
                time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
            });
            everyone.now.updateConnection(connection);
        });

        uavConnectionManager.on('connected', function() {
            connection = _.extend(connection, {
                status: uavConnectionManager.getState(),
                time_since_last_heartbeat: uavConnectionManager.timeSinceLastHeartbeat
            });
            everyone.now.updateConnection(connection);
        });
    }
}

app.get('/connection/start', function(req, res) {
    uavConnectionManager.start();
    res.send(204);
});


function loadParameters(parameters) {
  exit('23')
    logger.silly('in loadParameters');
    var promises = [];

    _.each(parameters, function(e) {
        promises.push(mavParams.set(e[0], e[1]));
    });

    Q.allSettled(promises).then(function(results) {
        res.send(200);
    }); 

}

app.get('/plugins/sitl/params/load', function(req, res) {
    logger.info('loading parameters');
    loadParameters(arduplaneParams);
});

app.get('/plugins/freeFlight/params/load', function(req, res) {
    logger.info('loading parameters');
    loadParameters(platforms[2].parameters);
});


app.get('/plugins/sitl/mission/load', function(req, res) {

    var mm = new MavMission(mavlink, mavlinkParser, uavConnectionManager, logger);
    var promise = mm.loadMission();
    
    Q.when(promise, function() {
        res.send(200);
    });
});

app.get('/plugins/sitl/mission/launch', function(req, res) {
  logger.debug('launching plane...');

  var plane = new planeUdl(logger, nconf);
  plane.setProtocol(mavlinkParser);
  plane.takeoff();
});

app.get('/platforms', function(req, res) {
  res.json(platforms);
});

// Refactoring swamp

/*


everyone.now.loadMission = function(msg) {
    
};

everyone.now.startMission = function(msg) {
    console.log('taking off');
    quad.takeoff();
};
*/

// Static/hardcoded data
var arduplaneParams = [
  ["AHRS_EKF_USE",1  ],
  ["ALT_CTRL_ALG",2  ],
  ["LOG_BITMASK",4095  ],
  ["MAG_ENABLE",1  ],
  ["TRIM_ARSPD_CM",2200  ],
  ["TRIM_PITCH_CD",0  ],
  ["TRIM_THROTTLE",50  ],
  ["LIM_PITCH_MIN",-2000  ],
  ["LIM_PITCH_MAX",2500  ],
  ["LIM_ROLL_CD",6500  ],
  ["LAND_PITCH_CD",100  ],
  ["LAND_FLARE_SEC",5  ],
  ["ARSPD_ENABLE",1  ],
  ["ARSPD_USE",1  ],
  ["ARSPD_FBW_MAX",30  ],
  ["ARSPD_FBW_MIN",10  ],
  ["KFF_RDDRMIX",0.5  ],
  ["THR_MAX",100  ],
  ["RC2_REV",-1  ],
  ["RC4_REV",-1  ],
  ["RC1_MAX",2000  ],
  ["RC1_MIN",1000  ],
  ["RC1_TRIM",1500  ],
  ["RC2_MAX",2000  ],
  ["RC2_MIN",1000  ],
  ["RC2_TRIM",1500  ],
  ["RC3_MAX",2000  ],
  ["RC3_MIN",1000  ],
  ["RC3_TRIM",1000  ],
  ["RC4_MAX",2000  ],
  ["RC4_MIN",1000  ],
  ["RC4_TRIM",1500  ],
  ["RC5_MAX",2000  ],
  ["RC5_MIN",1000  ],
  ["RC5_TRIM",1500  ],
  ["RC6_MAX",2000  ],
  ["RC6_MIN",1000  ],
  ["RC6_TRIM",1500  ],
  ["RC7_MAX",2000  ],
  ["RC7_MIN",1000  ],
  ["RC7_TRIM",1500  ],
  ["RC8_MAX",2000  ],
  ["RC8_MIN",1000  ],
  ["RC8_TRIM",1500  ],
  ["FLTMODE1",10  ],
  ["FLTMODE2",11  ],
  ["FLTMODE3",12  ],
  ["FLTMODE4",5  ],
  ["FLTMODE5",2  ],
  ["FLTMODE6",0  ],
  ["FLTMODE_CH",8  ],
  ["WP_LOITER_RAD",80  ],
  ["WP_RADIUS",50  ],
  ["RLL2SRV_D",0.2  ],
  ["RLL2SRV_I",0.3  ],
  ["RLL2SRV_P",2.5  ],
  ["RLL2SRV_RMAX",0  ],
  ["RLL2SRV_TCONST",0.5  ],
  ["PTCH2SRV_D",0.2  ],
  ["PTCH2SRV_I",0.3  ],
  ["PTCH2SRV_P",2.5  ],
  ["PTCH2SRV_RLL",1  ],
  ["NAVL1_PERIOD",15  ],
  ["ACRO_LOCKING",1  ],
  ["ELEVON_OUTPUT",0  ],
  ["VTAIL_OUTPUT",0  ],
  ["SKIP_GYRO_CAL",1  ]
]