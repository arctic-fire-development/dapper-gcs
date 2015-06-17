# Setup and Installation on Intel Edison

## Flashing Edison with latest OS from OS X
- install [horndis](http://joshuawise.com/downloads/HoRNDIS-rel7.pkg)
- restart os x
- download latest intel [flashing software](http://downloadmirror.intel.com/24910/eng/PhoneFlashToolLite_5.2.4.22_mac64.pkg) for edison
- download [latest edison image](http://downloadmirror.intel.com/24910/eng/edison-image-ww18-15.zip)
- point the intel flashing software to use the new firmware image
- connect the edison to the laptop via OTG port
- ensure intel flashing software detects the edison
- click ‘start to flash’
- will need to unplug the edison and replug in
- this will take a few minutes
- connect to the console port
- login using `bloop c`
- `configure_edison --version`
  - 146
- `configure_edison --setup`
- `wget https://raw.githubusercontent.com/arctic-fire-development/dapper-gcs/paths/etc/setup.sh --no-check-certificates`
- `chmod +x ./setup.sh`
- `wget http://repo.opkg.net/edison/repo/edison/kernel-module-bcm4334x_1.141-r47_edison.ipk --no-check-certificates`

later, install it manually
have the script auto-detect what stage of the setup it’s in

at this point you can continue from an ssh connection. this sometimes helps with the package downloads.

# Install and Setup Dapper-GCS from the "setup" script
- `./setup.sh`
  - follow the on-screen instructions
- Note: this script performs a git clone of the dapper repo.
  - Do not run it from within a cloned repo

# Install and Setup Dapper-GCS from the command line

## Setup Wifi
- now that the latest os is installed, it's time to get networking going
- run `configure_edison --setup`
    - give a password
    - give a new hostname
        - should be gcsXX, a label on the device should have this
    - connect to a wifi
- verify your connection
    - `curl -4 icanhazip.com`

## Fix /boot partition

Problem:

The /boot partition vfat filesystem is not created correctly by the Yocto packages. The edison-image-edison.hddimg is about 6MB, but the partition is 32MB, with the vfat partition only created the same size as the hddimg rather than the size of the partition.

Solution:
- if commented, uncomment the line in /etc/fstab for partition 7 (/boot)
- mount /boot
- mkdir /tmp/boot
- cp /boot/* /tmp/boot
- umount /boot
- mkfs.vfat /dev/mmcblk0p7
- mount /boot
- cp /tmp/boot/* /boot
- df -h

You should now have a 32MB /boot partition, plenty big enough for larger kernels

## Add repo

Problem:

There is no quick and easy way to install software binaries ala apt-get

Solution:

- `vi /etc/opkg/base-feeds.conf`
    ```bash
    ===/etc/opkg/base-feeds.conf contents below===
    src/gz all http://repo.opkg.net/edison/repo/all
    src/gz edison http://repo.opkg.net/edison/repo/edison
    src/gz core2-32 http://repo.opkg.net/edison/repo/core2-32

    ===end of /etc/opkg/base-feeds.conf contents===
    ```
- `opkg update`
- `opkg upgrade`

## Use new kernel and modules
- `cd /boot`
- `ls -l`
- `cp vmlinuz vmlinuz.original.ww05`
- `cp bzImage-3.10.17-yocto-standard vmlinuz`
- `opkg install kernel-modules`
- `opkg install --force-reinstall kernel-module-bcm4334x`
    - `modprobe: FATAL: Module bcm4334x not found.`
    - ignore this, everything is fine
- `reboot`
- `uname -a`
    - `3.10.17-yocto-standard`
- `lsmod`
```bash
Module                  Size  Used by
bcm4334x              574851  0
ftdi_sio               40121  0
usb_f_acm              14335  1
u_serial               18582  6 usb_f_acm
g_multi                70813  0
libcomposite           39245  2 usb_f_acm,g_multi
bcm_bt_lpm             13676  0
```

## Install Base Distribution

### Install GCS
- `npm install -g npm@latest`
- `npm install -g forever bower grunt-cli`
- `opkg install git`
    - `git config --global user.name "John Doe"`
    - `git config --global user.email johndoe@example.com`
    - `git config --global url."https://".insteadOf git://`
        - this makes it punch through timeout issues when behind a firewall
- `git clone https://github.com/arctic-fire-development/dapper-gcs.git`
- `cd dapper-gcs`
- `npm install`
    - this will take a while, be patient
- `bower install --allow-root`
    - this also will take a bit
- `grunt`

### Install mapproxy
- `wget https://bootstrap.pypa.io/get-pip.py --no-check-certificate`
- `python get-pip.py`
- `opkg install vim python-imaging python-sqlite3 python-dev libyaml-0-dev libjpeg-dev libz-dev libfreetype6`
- `pip install pyproj PyYAML`
    - this seems to take abnormally log to install once downloaded
    - be patient
- `pip install MapProxy`

### Config Scripts
- `cd dapper-gcs`
- `cp config.json.example config.json`
- `vim config.json`

    ```bash
    "mapproxy": {
        "url":"http://<HOSTNAME>.local:8080/service"
    }    be sure to set this to the correct hostname
    ```

    ```bash
    "connection" : {
        "type": "serial",
    }
    ```

    ```bash
      "serial" : {
        "device" : "auto",
    }
    ```
- `cp dapper-gcs.service /lib/systemd/system/`
- `cp dapper-mapproxy.service /lib/systemd/system/`
- verify they work
    - `systemctl stop edison_config.service`
        - this frees up port 80
    - `systemctl start dapper-mapproxy.service`
    - `systemctl start dapper-gcs.service`
- enable them to come up during boot
    - `systemctl enable dapper-mapproxy.service`
    - `systemctl enable dapper-gcs.service`
    - `systemctl disable edison_config.service`
- `netstat -tulpn | grep 80`
    - verify port 80 is node and 8080 is python

### Enable WiFi AP mode
- press and hold power button for 4-7seconds
- wifi ap should become available that is named the same as the hostname
- ssh into the machine
    - `reboot`
- verify ability to browse to http://gcsXX.local and http://gcsXX.local:8080

#### Alternative/Better Enable WiFi AP mode
- `systemctl stop wpa_supplicant.service`
- `systemctl disable wpa_supplicant.service`
- `systemctl enable hostapd.service`
- `systemctl start hostapd.service`
- `reboot`
- verify ability to browse to http://gcsXX.local and http://gcsXX.local:8080

### Switch from WiFi AP to WiFi client mode
- login via console
    - su to root if needed
- `systemctl status hostapd.service`
    - should see that it is active
- `systemctl status wpa_supplicant.service`
    - should see that is it not active/disabled
- `systemctl stop hostapd.service`
- `configure_edison --wifi`
    - select the network
    - provide credentials
- test connection
    - `opkg update` or
    - `ping www.google.com`

## Troubleshooting

### I Hosed my system and want to start from scratch
Ideally you'd be able to do this from OS X, however the reality is there is still something wonky with reflashing from this os.
Use a Linux system to do the re-flash. These steps involve a bit of bouncing back and forth between shells.
- connect the edison via usb otg to the linux box...
    - this shell will be called OTG
    - it's where you will run flash.sh
- connect the console to the linux box...
    - this shell will be called CONSOLE
    - it's where you will intterupt the boot sequence, and monitor the progress
- from CONSOLE
    - login as root
    - `reboot`
    - as the system reboots, it will give a VERY BRIEF opportunity to interrupt the boot sequence
        - hit <ENTER> to interrupt
    - you should now be at a prompt like this: `boot > `
- from OTG
    - cd into where the stock intel flash image is located
        - something like `cd edison-image-ww05-15`
    - run `sudo ./flashall.sh`
    - it will pause while waiting for the edison, this is good
- from CONSOLE
    - `run do_flash`
    - now the magic is happening
    - don't touch anything until everything finishes and you're at the login prompt
        - it will reboot a few times
        - process takes 5-10 minutes
    - once everything has settled down, login as root
    - `configure_edison --version`
        - `120`
- congratulations!! now you can start over

## Connecting to and upgrading Edison (from OS X)
note that this will not re-partition the hard drive

- install bloop
    - `npm install -g bloop`
- attach the edison to laptop with two micro-usb cables
- run `bloop sniff`
    - should get something like this `screen /dev/cu.usbserial-DA01LQHR 115200 -L`
- run that command to bring up the console
- press Enter a few times to bring up the console
    - type *root* and press *Enter*
        - there is no password
- connect the edison to your laptop with both cables
    - this enables the console and the mounted drive
- download the latest os distribution [from intel](http://www.intel.com/support/edison/sb/CS-035180.htm)
- unpack it
- cd into that folder
- upgrade the stock OS by pushing zip contents onto the mounted partition
- from the console
    - `reboot ota`
- once rebooted, log back in via `ssh root@192.168.2.15` or `ssh root@<MACHINE_NAME>.local`
- `configure_edison --version`
    - `120`


## Links:
- [yocto repo](http://alextgalileo.altervista.org/edison-package-repo-configuration-instructions.html)
- [install base intel provided image](https://communities.intel.com/docs/DOC-23193)
- [BSP users guide](https://communities.intel.com/docs/DOC-23159)
- [enable wifi ap mode](https://communities.intel.com/docs/DOC-23137)
- expand / repartition
- [clean up journaling bug](https://communities.intel.com/thread/55612?start=15&tstart=0)
- [increase root partition size](https://communities.intel.com/docs/DOC-23449)

## Notes:

### Using USB-serial FTDI adapters with Intel Edison
This has been RESOLVED with version 120!

The current Yocto kernel distro available for the Intel Edison (version 68 by configure_edison --version) does not include the FTDI driver. Thus when you plug a USB-serial adapter into the USB OTG host port, you’ll see it partially recognized in dmesg tail upon plugin, but you won’t see an assignment to a /dev/ttyUSB_ device.

You need to install the FTDI kernel module first.
- `opkg install kernel-module-ftdi-sio`
This assumes you have already setup the unofficial opkg repository.

Now when you type dmesg tail you’ll see the line something like
usb: FTDI USB Serial Device converter now attached to ttyUSB0

### Steps to build from scratch on ec2
- Fresh install of Ubuntu Server 14.04.1 x64
  - type: c4.8xlarge
  - storage: 100GB general ssd
- Refresh the repository lists with the command
  - `sudo apt-get update`
- Update your OS install
  - `sudo apt-get dist-upgrade`
- Get the pre-reqs
  - `sudo apt-get install build-essential git diffstat gawk chrpath texinfo libtool gcc-multilib`
- Configure git
  - `git config --global user.name "Your git user name"`
  - `git config --global user.email you@somedomain.whatever`
- Get the Edison Linux source files archive [here](http://www.intel.com/support/edison/sb/CS-035180.htm)
- Untar the archive.
  - `tar zxvf edison-src-ww*****`
  - I put it in my home directory.
- run setup
  - `cd edison-src`
  - `./device-software/setup.sh`
- Get the number of processor cores available in your system
  - `getconf _NPROCESSORS_ONLN`
- Edit the ./build/conf/local.conf file
  - set BB_NUMBER_THREADS equal to the number returned by `getconf _NPROCESSORS_ONLN` multiplied by 2
  - set the number after PARALLEL_MAKE equal to the number returned by `getconf _NPROCESSORS_ONLN` multiplied by 1.5
- Run command `source poky/oe-init-build-env`
- Run command `bitbake edison-image`
- Sit back and let your system pull the necessary files and compile them, mine took 10 minutes on c4.2xlarge  but most systems will take a few hours.
- create flash
  - `cd /edison-src/device-software/utils/flash`
  - `./postBuild.sh`
    - You may get some errors about "No such file or directory" which can be ignored as long as you don't want to use `reboot ota`
- use scp to copy /edison-src/build/toFlash to local linux box
- now on your local linux box
- Install the DFU utilities
  - `sudo apt-get install dfu-util`
- If your Edison is plugged into your Linux system then unplug both USB cables from it so your Edison is powered off
- Flash your Edison with your newly compiled firmware with the command "sudo ./flashall.sh" which will prompt you to plug in your Edison board with the two USB connections.
- Flashing will take awhile and the Edison will be reset twice so be patient
- Open a serial terminal connection to your Edison and log in as root with no password
- Configure some basic settings on your Edison with the command "configure_edison --setup" which should now allow you to connect to your Edison over WiFi with SSH.
