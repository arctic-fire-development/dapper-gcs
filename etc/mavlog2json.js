// Usage: node etc/mavlog2json.js logfile
// Dumps a mavlink binary file into json-formatted text.
// (not strict JSON, but enough to parse with JS and stuff)

var MAVLink = require("mavlink_ardupilotmega_v1.0"),
    fs = require('fs'),
    sprintf = require("sprintf-js").sprintf,
    stringify = require('node-stringify'),
    _ = require('underscore');


var messages = fs.readFileSync(process.argv[2]);
var mavlinkParser = new MAVLink();

// Example of doing cheap/fast log analysis here: we just want some values from mission items.
// mavlinkParser.on('MISSION_ITEM', function(message) {
//   console.log(sprintf('X %4.6f, Y %4.6f, Z %4.6f', message.x, message.y, message.z));
// });

// Example of converting the entire file at once
mavlinkParser.on('message', function(message) {
	var nonce = {};
	_.each(message.fieldnames, function(field) {
		nonce[field] = message[field]; // make a temp object with just the properties we want
	});
  console.log(message.name, ':', stringify(message));
});

mavlinkParser.pushBuffer(messages);
mavlinkParser.parseBuffer();
