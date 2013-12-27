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

I couldn't get it to run otherwise.

```cd ardupilot/Tools/autotest```

eg: ```vim sim_arduplane.sh```

edit line 50 by adding an "&" to the end of the command to throw it in the background

```gnome-terminal -e "/tmp/ArduPlane.build/ArduPlane.elf -I$INSTANCE" &```

### Step 5: Start the Simulator

```bash
cd ardupilot/Tools/autotest
./sim_arduplane.sh --console --map --aircraft test

You should see a bunch of popups. One of them will be a commandline mavlink interface

### Step 6: Configure the virtual plane

In the mavlink commandline interface window, execute the following

```bash
param load ArduPlane.parm
wp load ArduPlane-Missions/CMAC-toff-loop.txt
auto
```

Now you should see the simulator flying a virtual plane.

## Resources
- [1](http://dev.ardupilot.com/wiki/setting-up-sitl-on-linux/)
- [2](http://diydrones.com/forum/topics/apm-sitl-with-flightgear-and-ubuntu?id=705844%3ATopic%3A955083&page=3#comments)