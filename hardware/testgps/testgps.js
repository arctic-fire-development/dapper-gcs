#!/usr/bin/env node

var gpsd = require('node-gpsd');

var listener = new gpsd.Listener({
    port: 2947,
    hostname: 'nes-multicam.local',
    logger:  { 
        info: function() {}, 
        warn: console.warn, 
        error: console.error 
    }
});

listener.logger = console;

listener.connect(function () {
    console.log('connected');
    listener.watch();
});

listener.on('TPV', function (tpv) {
    console.log(tpv);
});