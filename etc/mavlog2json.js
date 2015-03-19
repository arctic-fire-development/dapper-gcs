// Usage: node etc/mavlog2json.js logfile
// Dumps a mavlink binary file into json-formatted text.
// (not strict JSON, but enough to parse with JS and stuff)

var MAVLink = require("mavlink_ardupilotmega_v1.0"),
    fs = require('fs'),
    sprintf = require("sprintf-js").sprintf;

var messages = fs.readFileSync(process.argv[2]);
var mavlinkParser = new MAVLink();

// Example of doing cheap/fast log analysis here: we just want some values from mission items.
// mavlinkParser.on('MISSION_ITEM', function(message) {
//   console.log(sprintf('X %4.6f, Y %4.6f, Z %4.6f', message.x, message.y, message.z));
// });

// Example of converting the entire file at once
mavlinkParser.on('message', function(message) {
  console.log(message);
});

mavlinkParser.pushBuffer(messages);
mavlinkParser.parseBuffer();
