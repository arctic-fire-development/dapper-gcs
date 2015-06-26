## Dapper - Unmanned Ground Control Station

node.js + HTML5 UAV ground station software emphasizing data collection and mission operations.

### Installation (for development)

#### Prerequisites

You need ```git```, ```node```, ```npm``` (distributed with node, usually), ```bower``` and ```grunt```.  On OSX, [install Node.js from an installer](http://nodejs.org/#download), then the rest with brew and npm:

```bash
brew install git
sudo npm install -g grunt-cli
sudo npm install -g bower
sudo npm install -g forever
sudo npm install -g nodemon
```

#### Running

After installing prerequisites, clone this project and install dependencies, then build runtime files with ```grunt```:

```bash
git clone git@github.com:arctic-fire-development/dapper-gcs.git
cd dapper-gcs/
npm install
bower install
mkdir logs
mkdir tmp
cp config.json.example config.json
grunt
```

### Configuration

Work in progress, you need to specify the connection type in the ```config.json``` file at the root of the project (copy/paste the ```config.json.example``` file as a template), and update the relevant fields (host, port, serial device, etc).

### Running the project

A new build of source files is fired off anytime any files that are used by the client are modified -- it takes a few moments, so when you save the file, it may be a few seconds before your changes are visible in the restarted node process.

```bash
grunt
```

### Project architecture and structure

# outdated fixme

Below is an overview of app/directory structure.

```bash
tree -L 3 -I "node_modules|bower|*.svg|*.less|*."
```

```
├── app <<< Client Side
│   ├── Models <<< Client Side Backbone Models
│   ├── Templates <<< Client Side Backbone Templates
│   ├── Views <<< Client Side Backbone Views
│   ├── app.js
│   ├── assets <<< Bower things are installed here.
│   │   └── leaflet-touch-extend.js
│   ├── config.js <<< for RequireJS, very important; partly auto-managed
│   ├── main.js
│   ├── router.js
│   └── routines  <<< Different Mission Types
│       ├── components
│       ├── freeFlight
│       └── paths
├── assets <<< Server Side
│   ├── fonts
│   ├── images
│   ├── js <<< Server Side libraries
│   └── less
├── bower.json
├── build <<< Grunt aut-generated... do not touch
├── config.json.example
├── dapper-gcs.service <<< systemd service file
├── dapper-mapproxy.service <<< systemd service file
├── docs <<< Anything you think is good documention!
├── etc <<< Garbage pail for stuff that should be in version control
├── hardware <<< info for setting up the hardware
│   ├── BeagleBone-Black <<< not under development anymore
│   ├── README.md <<< Instructions for setting up the Intel Edison
│   ├── afpd.service
│   ├── misc <<< development notes
│   ├── pcduino <<< not under development anymore
│   └── testgps
│       └── testgps.js
├── logs <<< where log files get put when developing
├── overview.md
├── package.json
├── public <<< Express "public" web root, never add things here
├── routes <<< Express routes, not used much
├── run-mapproxy.sh <<< script for launching mapproxy
├── run-sitl.sh <<< script for launching SITL
├── server.js <<< Server Side main program
├── test
├── tmp
└── views <<< Express views
```


## Development recipes

### Adding content or widgets

(sketch)  TODO make a boilerplate for these

 * create the template
 * create the view
 * find the appropriate router and add your view renderer there

### Adding a new JS dependency via Bower

(sketch)

 * ```bower install --save new_package```
 * hook up the JS
    * if you use the code via RequireJS, it should be auto-added in ```app/config.js```
    * check there to see what the exported name is
 * hook up LESS/CSS
    * if LESS, then add it via an ```@import``` directive in the ```assets/less/assets.less``` directory.
    * if CSS, then make sure it's part of the ```mincss``` task in the Gruntfile configuration.
 * copy in static assets
  * in the ```copy``` task in the Gruntfile, add appropriate entries to copy over static assets.



## Working with ArduPilot hardware & SITL

(OSX) You'll need to install the [FTDI Arduino MegaPilot driver](http://www.ftdichip.com/Drivers/VCP.htm) before the OS X will recognize the ArduPilot.

if connecting via the usb, be sure to set the baudrate in config.json:

```json
{
  ...
  "baudrate" : 115200
  ...
}
```

#### Using SITL on a remote host

Assuming you're able to get the [SITL guide on this page](http://dev.ardupilot.com/software-in-the-loop-sitl/) running, here's how to connect this ground station to that SITL/JBSim instance pair.  For this setup, we won't have MAVProxy in the loop.  On the machine running the simulation, you need to ensure that you can access some TCP port (by default, ArduPilot will use 5760) from wherever the ground station is running.

 1. Start the ArduPlane simulator: ```/tmp/ArduPlane.build/ArduPlane.elf &```
 2. Start JSBSim: ```python ./ardupilot/Tools/autotest/jsbsim/runsim.py --home=-35.362938,149.165085,584,270 &```
 3. Change the config.json file for your ground station to be ```tcp```, and to connect to the correct IP/port on  the machine running the ArduPlane/ArduCopter and JSBSim.
 4. Start the ground station: ```grunt```
 5. Open a web page to ```localhost:3000```

### Installing offline tile cache system

 1. ```sudo pip install pyproj PyYAML```
 2. ```sudo pip install MapProxy```
 3. To launch the cache:

```javascript
cd /path/to/repo
mapproxy-util serve-develop -b 0.0.0.0:8080 etc/bing.yaml
```

### Testing

#### Configuration on Jenkins

The ```config.json.example``` file is used to configure Jenkins' runtime environment.  It's copied to ```config.json```, so that file needs to be updated as appropriate if new config options are added.  For testing, the important configuration at this time is the location of the virtual serial ports.

#### Running tests

Some additional prerequsites may be required:

```
npm install -g grunt-cli
```

There's two different collections of test suites: ones that run on the server, and ones that run on the GUI/interface layer.  Mocha is used for the server-side tests, Jasmine for the GUI layer.

To run server-side (mocha) tests in the development environment:

```bash
mocha test
```

To run Mocha tests for xunit output (for CI/Jenkins):

```bash
mocha --reporter xunit test/mocha
```

To run client-side Jasmine tests, open a web browser and open the ```test/jasmine/index.html``` HTML page.

#### Running SITL for development

First, run the vagrant install of the APM development environment.

There's two types of SITL we can attach to.  One is where the GCS is slaved to a read-only UDP stream running on the guest VM in MAVProxy; the other is attaching the GCS directly to the APM SITL.  The first case is useful for GUI-only testing, the second for command/control of the autopilot from the GCS.

##### UDP Slave SITL mode

In GCS ```config.json```, set ```connection: 'udp'```.

```bash
vagrant ssh # note the IP address of the host
cd ardupilot/ArduPlane/
../Tools/autotest/sim_vehicle.sh --console --map --aircraft test --out 10.0.2.2:14550 # use IP address of host here
```

Inside the launched MAVProxy console in the guest VM:

```
wp load ../Tools/autotest/ArduPlane-Missions/CMAC-toff-loop.txt
auto
```

#### References for library components manually installed
- [jQuery Toolbar](https://github.com/paulkinzett/toolbar)
- [node-jspack](https://github.com/pgriess/node-jspack)

# License Information

This code is released under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.txt).
