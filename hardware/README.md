# Setup and Installation

## Setup Wifi



## Initial Fixes

### Fix /boot partition

Problem:

The /boot partition vfat filesystem is not created correctly by the Yocto packages. The edison-image-edison.hddimg is about 6MB, but the partition is 32MB, with the vfat partition only created the same size as the hddimg rather than the size of the partition.

Solution:
- uncomment the line in /etc/fstab for partition 7 (/boot)
- mount /boot
- mkdir /tmp/boot
- mv /boot/* /tmp/boot
- umount /boot
- mkfs.vfat /dev/mmcblk0p7
- mount /boot
- cp /tmp/boot/* /boot

You should now have a 32MB /boot partition, plenty big enough for larger kernels

### Put /usr/lib in /home/root to free up os space
- cd /home/root
- mkdir -p usr/lib
- cd usr/lib
- cp -Rv /usr/lib/* .
- mv /usr/lib /usr/lib-orig
- ln -s /home/root/usr/lib /usr/lib

### Add repo

Problem:

There is no quick and easy way to install software binaries ala apt-get

Solution:

- `vi /etc/opkg/base-feeds.conf`
    ```
    ===/etc/opkg/base-feeds.conf contents below===
    src/gz all http://repo.opkg.net/edison/repo/all
    src/gz edison http://repo.opkg.net/edison/repo/edison
    src/gz core2-32 http://repo.opkg.net/edison/repo/core2-32

    ===end of /etc/opkg/base-feeds.conf contents===
    ```
- `opkg update`
- `opkg upgrade`

## Install Base Distribution

## Configure System

## Install GCS

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
  - You may get some errors about "No such file or directory" which can be ignored
- use scp to copy /edison-src/build/toFlash to local linux box
- now on your local linux box
- Install the DFU utilities
  - `sudo apt-get install dfu-util`
- If your Edison is plugged into your Linux system then unplug both USB cables from it so your Edison is powered off
- Flash your Edison with your newly compiled firmware with the command "sudo ./flashall.sh" which will prompt you to plug in your Edison board with the two USB connections.
- Flashing will take awhile and the Edison will be reset twice so be patient
- Open a serial terminal connection to your Edison and log in as root with no password
- Configure some basic settings on your Edison with the command "configure-edison --setup" which should now allow you to connect to your Edison over WiFi with SSH.

