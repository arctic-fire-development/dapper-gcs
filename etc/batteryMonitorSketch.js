// This is a sketch of what we'd need to do to read the battery monitor.

var readline = require('readline');
var m = require('mraa');
var i2c = new m.I2c(1);
i2c.address(0x55);

// Set the bus to the right speed
var exec = require('child_process').exec, child;
child = exec('echo std > /sys/devices/pci0000:00/0000:00:08.0/i2c_dw_sysnode/mod
e', function(error, stdout, stderr) {});

// Enable this to put the system under significant stress!
// child = exec('stress -c 2 -i 2 -m 2 -d 2', function(error, stdout, stderr) {});

console.log("Reading I2C..");

function readBattery() {
  var d = i2c.readReg(0x2c);
  console.log("Result (CSOC %): " + d);

  var voltage = readInt16(0x09, 0x08);
  console.log('Reported Voltage High (mV): ' + voltage);
  console.log('Time to full (minutes): ' + readInt16(0x19, 0x18));
  console.log('Time to empty (minutes): ' + readInt16(0x17, 0x16));
  var temperature = readInt16(0x07, 0x06);
  temperature = (((temperature * .25) - 273.15) * 1.8) + 32;
  console.log('Temperature (F): ' + Math.round(temperature));

  var current = readInt16(0x15, 0x14);
  current = (current * 3.57) / 75;
  console.log('Current (mA): ' + current);
  console.log('Power consumption (W): ' + ((current / 1000) * (voltage / 1000)))
;
}

function readInt16(highReg, lowReg) {
  // from page 26 of the docs, this is the way to read 16 bit values.
  var high = i2c.readReg(highReg);
  var low = i2c.readReg(lowReg);
  var high2 = i2c.readReg(highReg);
  if( high2 !== high) {
    low = i2c.readReg(lowReg);
    high = high2;
  }
  return (high << 8) | low;
}

setInterval(readBattery, 1000);
readBattery();
