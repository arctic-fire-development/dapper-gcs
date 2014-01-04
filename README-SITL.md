## SITL README

### Step 1: Install Dependencies

```sudo apt-get install python-pip python-matplotlib python-serial python-wxgtk2.8 python-scipy python-opencv ccache expat libexpat1 libexpat1-dev gpsbabel gnome-terminal```

if you want FlightGear for visual verification

```sudo apt-get install flightgear```

### Step 2: Install MAVProxy and mavlink

```sudo pip install mavproxy pymavlink```

### Step 3: Add directories to your search path

Add the following lines to .bashrc or .profile

```export PATH=/usr/lib/ccache:$PATH```

Then reload your PATH

```. ~/.bashrc```

or

```. ~/.profile```

### Step 4: Edit one of the simulator scripts

```cd ardupilot/Tools/autotest```

eg: ```vim sim_arduplane.sh```

edit line 50 by adding an "&" to the end of the command to throw it in the background

```gnome-terminal -e "/tmp/ArduPlane.build/ArduPlane.elf -I$INSTANCE" &```

I couldn't get it to run otherwise.

### Step 5: Start the Simulator

```bash
cd ardupilot/Tools/autotest
./sim_arduplane.sh --console --map --aircraft test
```

You should see a bunch of popups. One of them will be a commandline mavlink interface

### Step 6: Configure the virtual plane

In the mavlink commandline interface window, execute the following

```bash
param load ArduPlane.parm
wp load ArduPlane-Missions/CMAC-toff-loop.txt
auto
```

Now you should see the simulator flying a virtual plane.


### Alternative to the simulator script

You'll need a few terminals open

First terminal: run ArduPlane.elf

```
/tmp/ArduPlane.build/ArduPlane.elf
```

Second terminal: run mavproxy

```
mavproxy.py --master tcp:127.0.0.1:5760 --sitl 127.0.0.1:5501
```

Third terminal: run jsbsim

```
cd ardupilot/Tools/autotest/jsbsim
./runsim.py --home=-35.362938,149.165085,584,270 --script=jsbsim/rascal_test.xml --fgout=127.0.0.1:5503
```

## Resources
- [1 current ardupilot dev sitl wiki](http://dev.ardupilot.com/wiki/setting-up-sitl-on-linux/)
- [2 a forum topic](http://diydrones.com/forum/topics/apm-sitl-with-flightgear-and-ubuntu?id=705844%3ATopic%3A955083&page=3#comments)
- [3 from old google code repo wiki](https://code.google.com/p/ardupilot-mega/wiki/SITL)