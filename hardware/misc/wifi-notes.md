wifi-notes.md

http://www.elinux.org/Beagleboard:BeagleBoneBlack#WIFI_Adapters

http://en.wikipedia.org/wiki/Wi-Fi_Direct
	- software layer on top of ad-hoc mode
	- enables any wifi usb dongle to be used as a router

http://embeddedprogrammer.blogspot.de/2012/10/beaglebone-installing-ubuntu-1210.html
http://embeddedprogrammer.blogspot.com/2013/01/beaglebone-using-usb-wifi-dongle-to.html


cpufreq-set -c 0 -g performance



sudo mkdir -p /opt/scripts/
sudo chown -R (user):(user) /opt/scripts
git clone git://github.com/RobertCNelson/boot-scripts /opt/scripts
cd /opt/scripts/
./tools/update_kernel.sh --beta-kernel