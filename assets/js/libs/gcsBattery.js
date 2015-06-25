/*global module, setInterval */

var os = require('os');
var isEdison = /^gcs/.test(os.hostname());
if (isEdison) {
    var m = require('mraa');
    var i2c = new m.I2c(1);
    var exec = require('child_process').exec,
        child;
    child = exec('echo std > /sys/devices/pci0000:00/0000:00:08.0/i2c_dw_sysnode/mode', function(error, stdout, stderr) {});
}

var log; //global logger object derived from winston
var io; //global socket.io

function GCSBattery(logger, socket) {
    'use strict';
    log = logger;
    io = socket;
}

GCSBattery.prototype.readBattery = function() {
    'use strict';
    this.consStateOfCharge = i2c.readReg(0x2c);
    this.timeToFull = this.readInt16(0x19, 0x18);
    this.timeToEmpty = this.readInt16(0x17, 0x16);
    this.voltage = this.readInt16(0x09, 0x08);
    this.temperature = Math.round((((this.readInt16(0x07, 0x06) * 0.25) - 273.15) * 1.8) + 32);
    this.avgCurrent = (this.readInt16(0x15, 0x14) * 3.57) / 75;
    this.powerConsumption = Math.round(((this.avgCurrent / 1000) * (this.voltage / 1000)));

    log.silly('GCS Battery: Result (CSOC %): ' + this.consStateOfCharge);
    log.silly('GCS Battery: Reported Voltage High (mV): ' + this.voltage);
    log.silly('GCS Battery: Time to full (minutes): ' + this.timeToFull);
    log.silly('GCS Battery: Time to empty (minutes): ' + this.timeToEmpty);
    log.silly('GCS Battery: Temperature (F): ' + this.temperature);
    log.silly('GCS Battery: Average Current (mA): ' + this.avgCurrent);
    log.silly('GCS Battery: Power consumption (W): ' + this.powerConsumption);
};

GCSBattery.prototype.readInt16 = function(highReg, lowReg) {
    'use strict';
    // from page 26 of the docs, this is the way to read 16 bit values.
    var high = i2c.readReg(highReg);
    var low = i2c.readReg(lowReg);
    var high2 = i2c.readReg(highReg);
    if (high2 !== high) {
        low = i2c.readReg(lowReg);
        high = high2;
    }
    return (high << 8) | low;
};

GCSBattery.prototype.startMonitor = function() {
    'use strict';
    if (false === isEdison) {
        log.info('GCS Battery: Not running on Edison platform, no Battery available');
    } else {
        log.info('GCS Battery: Starting Battery Monitor');
        setInterval(this.readBattery, 1000 * 60); //run every minute
        this.readBattery();
    }

};

module.exports = GCSBattery;
