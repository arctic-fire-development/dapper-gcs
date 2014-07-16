# This is just a draft convenience file.  To start the simulator:
/home/vagrant/ardupilot/Tools/autotest/run_in_terminal_window.sh ardupilot /tmp/ArduCopter.build/ArduCopter.elf -I0 -w ;
/home/vagrant/ardupilot/Tools/autotest/run_in_terminal_window.sh /home/vagrant/ardupilot/Tools/autotest/pysim/sim_multicopter.py --home=-35.363261,149.165230,584,353

# To kill the simulator:
killall -q ArduCopter.elf; pkill -f sim_multicopter.py