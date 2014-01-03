define(['jade'], function(jade) { if(jade && jade['runtime'] !== undefined) { jade = jade.runtime; }

this["JST"] = this["JST"] || {};

this["JST"]["app/Templates/altitudeWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),alt = locals_.alt;jade.indent = [];
buf.push("\n<h3>Altitude</h3>\n<div><span class=\"value\">" + (((jade.interp = alt) == null ? '' : jade.interp)) + "</span><span class=\"units\">&nbsp;meters</span></div>");;return buf.join("");
};

this["JST"]["app/Templates/batteryWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),battery_remaining = locals_.battery_remaining,voltage_battery = locals_.voltage_battery,current_battery = locals_.current_battery;jade.indent = [];
buf.push("\n<h3>Battery</h3>\n<div><span class=\"value\">" + (((jade.interp = battery_remaining) == null ? '' : jade.interp)) + "</span><span class=\"units\">&nbsp;%</span></div>\n<div><span class=\"value\">" + (((jade.interp = voltage_battery) == null ? '' : jade.interp)) + "</span><span class=\"units\">&nbsp;v</span></div>\n<div><span class=\"value\">" + (((jade.interp = current_battery) == null ? '' : jade.interp)) + "</span><span class=\"units\">&nbsp;A</span></div>");;return buf.join("");
};

this["JST"]["app/Templates/commsWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),time_since_last_heartbeat = locals_.time_since_last_heartbeat;jade.indent = [];
buf.push("\n<div id=\"comms\">\n  <div class=\"disconnected\">Disconnected.</div>\n  <div class=\"connecting\">Connecting" + (((jade.interp = time_since_last_heartbeat) == null ? '' : jade.interp)) + ".</div>\n  <div class=\"connected\">Connected.</div>\n  <div>\n    <button id=\"loadParams\">Load Parameters</button>\n    <button id=\"loadMission\">Load Mission</button>\n    <button id=\"startMission\">Start Mission Wooo!</button>\n  </div>\n</div>");;return buf.join("");
};

this["JST"]["app/Templates/gpsWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),lat = locals_.lat,lon = locals_.lon,fix_type = locals_.fix_type,satellites_visible = locals_.satellites_visible;jade.indent = [];
buf.push("\n<h3>GPS</h3>\n<div id=\"position\"><span class=\"units\">lat &nbsp;</span><span class=\"value\">" + (((jade.interp = lat) == null ? '' : jade.interp)) + " &nbsp;</span><span class=\"units\">lon &nbsp;</span><span class=\"value\">" + (((jade.interp = lon) == null ? '' : jade.interp)) + " &nbsp;</span></div>\n<div id=\"gps_stats\">\n  <div id=\"location\"><span class=\"units\">fix_type &nbsp;</span><span class=\"value\">" + (((jade.interp = fix_type) == null ? '' : jade.interp)) + " &nbsp;</span></div>\n  <div id=\"stats\"><span class=\"units\">satellites_visible &nbsp;</span><span class=\"value\">" + (((jade.interp = satellites_visible) == null ? '' : jade.interp)) + " &nbsp;</span></div>\n</div>");;return buf.join("");
};

this["JST"]["app/Templates/healthWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),stateMode = locals_.stateMode;jade.indent = [];
buf.push("\n<div class=\"flightMode\">Flight Mode: " + (((jade.interp = stateMode) == null ? '' : jade.interp)) + "</div>\n<div class=\"flightModeArmed\">Armed</div>\n<div class=\"flightModeDisarmed\">Disarmed</div>");;return buf.join("");
};

this["JST"]["app/Templates/missionLayout"] = function anonymous(locals) {
var buf = [];
jade.indent = [];
buf.push("\n<div id=\"widgets\">\n  <div id=\"speedWidget\" class=\"widget\"></div>\n  <div id=\"altitudeWidget\" class=\"widget\"></div>\n  <div id=\"signalStrengthWidget\" class=\"widget\"></div>\n  <div id=\"batteryWidget\" class=\"widget\"></div>\n  <div id=\"healthWidget\" class=\"widget\"></div>\n  <div id=\"stateWidget\" class=\"widget\"></div>\n</div>\n<div id=\"mapWidget\"></div>\n<div id=\"gpsWidget\" class=\"widget\"></div>\n<div id=\"toolbarWidget\"></div>\n<div id=\"commsWidget\" class=\"widget\"></div>");;return buf.join("");
};

this["JST"]["app/Templates/signalStrengthWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),icon = locals_.icon;jade.indent = [];
buf.push("\n<h3>Signal Strength</h3><img" + (jade.attrs({ 'src':(icon) }, {"src":true})) + "/>");;return buf.join("");
};

this["JST"]["app/Templates/speedWidget"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),groundspeed = locals_.groundspeed;jade.indent = [];
buf.push("\n<h3>Ground Speed</h3><span class=\"value\">" + (((jade.interp = groundspeed) == null ? '' : jade.interp)) + "</span><span class=\"units\">&nbsp;km/h</span>");;return buf.join("");
};

this["JST"]["app/Templates/stateWidget"] = function anonymous(locals) {
var buf = [];
jade.indent = [];
buf.push("\n<h3>State</h3><span class=\"value\">state</span>");;return buf.join("");
};

this["JST"]["app/Templates/toolbarWidget"] = function anonymous(locals) {
var buf = [];
jade.indent = [];
buf.push("\n<div id=\"settingsUser\" class=\"settings-button\"><img src=\"images/icon-cog-shadow.png\"/></div>\n<div id=\"user-toolbar-options\" class=\"toolbar-icons\"><a href=\"#\"><i class=\"icon-user\"></i></a><a href=\"#\"><i class=\"icon-star\"></i></a><a href=\"#\"><i class=\"icon-edit\"></i></a><a href=\"#\"><i class=\"icon-delete\"></i></a><a href=\"#\"><i class=\"icon-ban\"></i></a></div>");;return buf.join("");
};

return this["JST"];

});