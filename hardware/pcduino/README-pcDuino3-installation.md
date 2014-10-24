## pcDuino3 installation

### setup dev platform

1.  install pre-reqs
    - `sudo apt-get install -y $(cat build-system-apt-get-list.txt | awk '{print $1}')`
2.  if in virtualbox, add the user to the vboxsf group
    - `sudo usermod -a -G vboxsf wilsonrm`
    - re- login for changes to take effect
3.  download u-boot, kernel, rootfs, wireless AP daemon, sunxi tools and boards
    - run `./clone-repos.sh`
4.  if on OS X
    - you will need the drivers for the usb-tty device
        - `git clone https://github.com/changux/pl2303osx.git`
        - double click PL2303_Serial-USB_on_OSX_Lion.pkg
    - install kermit from here:
        - [kermit](http://www.kermitproject.org/ck90.html#source)
    - setup .kermrc
        - replace /dev/tty.PL2303-00001014 with whatever it shows up as in /dev
        ```bash
        set line /dev/tty.PL2303-00001014
        set speed 115200
        set carrier-watch off
        set handshake none
        set flow-control none
        robust
        set file type bin
        set file name lit
        set rec pack 1000
        set send pack 1000
        set window 5
        set prompt Kermit>
        ```
5.  make a buildout directory
    - `cd ~`
    - `mkdir pcduino-buildout`

## Build from Existing pcDuino 3 board
1. boot pcduino without an sd card
2. as root, run `board-config.sh`
3. select update -> all
4. select make_mmc_boot
    - insert sd card
5. reboot with bootable sd card
6. [resize root fs](http://elinux.org/Beagleboard:Expanding_File_System_Partition_On_A_microSD)
7. continue with "OS Setup" instructions below


## Build from Scratch

### compile u-boot

1.  `cd u-boot-sunxi`
2.  `mkdir build`
3.  `make CROSS_COMPILE=arm-linux-gnueabihf- Linksprite_pcDuino3_config O=build`
4.  `make CROSS_COMPILE=arm-linux-gnueabihf- O=build`
5.  `cp build/u-boot-sunxi-with-spl.bin ~/pcduino-buildout/`

### build the board specific script.bin

script.bin is a file with very important configuration parameters like port GPIO assignments, DDR memory parameters, etc

1.  `cd sunxi-tools`
    - `make fex2bin`
2.  `cd sunxi-boards`
    - `cp sys_config/a20/linksprite_pcduino3.fex ~/pcduino-buildout`
    - `cd ~/pcduino-buildout`
3.  edit linksprite_pcduino3.fex
    - for usbc0
        - change `usb_port_type` from 0 to 1 to make it a USB host
    - `~/sunxi-tools/fex2bin linksprite_pcduino3.fex > script.bin`
4. should now have script.bin in ~/pcduino-buildout/

### compile linux kernel

1.  `cd linux-sunxi`
2.  verify you are in the sunxi-next branch
    - `git status`
3.  make build directory
    - `mkdir build`
4.  build the kernel (uImage), dtb, and modules
    - copy the .config from dapper-hw
        - `cp ~/dapper-hw/kernel.config ./build/.config`
    - make oldconfig
        - `make ARCH=arm CFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CXXFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CROSS_COMPILE=arm-linux-gnueabihf- LOADADDR=40008000 O=./build/ oldconfig`
    - make uImage dtbs and modules
        - `make ARCH=arm CFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CXXFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CROSS_COMPILE=arm-linux-gnueabihf- LOADADDR=40008000 O=./build/ uImage dtbs modules -j 4`

6.  copy kernel and dtb to ~/pcduino-buildout
    - `cp arch/arm/boot/uImage ~/pcduino-buildout/`
    - `cp arch/arm/boot/dts/sun7i-a20-pcduino3.dtb ~/pcduino-buildout/dtb`
        - notice we renamed it on the fly to "dtb"
7.  install modules to the pcduino-buildout folder
    - `mkdir ~/pcduino-buildout/rootfs`
    - `make ARCH=arm CFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CXXFLAGS="-mcpu=cortex-a7 -mtune=cortex-a7 -mfloat-abi=hard -mfpu=vfpv4" CROSS_COMPILE=arm-linux-gnueabihf- LOADADDR=40008000 O=./build/ modules_install INSTALL_MOD_PATH=~/pcduino-buildout/rootfs`
8.  `cd ~`

#### to rebuild the .config from scratch
1.  generate the .config file and add the following to the kernel
    - `ARCH=arm CROSS_COMPILER=arm-linux-gnueabihf- make sunxi_defconfig O=build`
    - `ARCH=arm CROSS_COMPILER=arm-linux-gnueabihf- make menuconfig O=build`
    - select the following
        - modules:
        ```bash
        [*] Enable loadable module support  —>
            [*] Forced module loading
            [*] Module unloading
            [*] Forced module unloading
        ```
        - system selection
        ```bash
        System Type —>
        [*] Allwinner SoCs —>
            [*] Allwinner A20 (sun7i) SoCs support
        ```
        - USB
        ```bash
        [*] USB support —>
            <M> USB Mass Storage —>
            --- all as M
        ```
        - other device drivers
        ```bash
        [*] Device Drivers ->
            [*] USB Serial Converter —>
                <M> USB Generic Serial Driver
                <M> USB FTDI
        ```
        - yet more device drivers
        ```bash
        [*] Device Drivers ->
            [*] Network Device Support ->
                [*] Wireless Lan
            [*] Staging —>
                <M> RTL8188EU
                <M> as AP
        ```
## Installation
### prep sd card

1.  insert >4GB into computer
2.  use dmesg or similar to get the device location (/dev/sdb or /dev/mmcblk0, etc)
    - `CARD=/dev/sdb`
3.  unmount it
    - `sudo umount /dev/sdb`
4.  format with gparted or similar
    - be sure to have dos partition table created
5.  clean it with dd, skip the partition table
    - `sudo dd if=/dev/zero of=/dev/sdb bs=1k count=1023 seek=1`
    - may need to create msdos partition table with gparted
5.  ensure it is still unmounted
    - `sudo umount /dev/sdb`
6.  make new partitions
    ```bash
    fdisk /dev/sdb

    Command (m for help): n
    Partition type:
       p   primary (0 primary, 0 extended, 4 free)
       e   extended
    Select (default p): p
    Partition number (1-4, default 1): 1
    First sector (2048-15523839, default 2048): 2048
    Last sector, +sectors or +size{K,M,G} (2048-15523839, default 15523839): +15M

    Command (m for help): n
    Partition type:
       p   primary (1 primary, 0 extended, 3 free)
       e   extended
    Select (default p): p
    Partition number (1-4, default 2): 2
    First sector (32768-15523839, default 32768): 32768
    Last sector, +sectors or +size{K,M,G} (32768-15523839, default 15523839): +240M

    Command (m for help): p

    Disk /dev/sdb: 7948 MB, 7948206080 bytes
    4 heads, 16 sectors/track, 242560 cylinders, total 15523840 sectors
    Units = sectors of 1 * 512 = 512 bytes
    Sector size (logical/physical): 512 bytes / 512 bytes
    I/O size (minimum/optimal): 512 bytes / 512 bytes
    Disk identifier: 0x17002d14

            Device Boot      Start         End      Blocks   Id  System
    /dev/sdb1            2048       32767       15360   83  Linux
    /dev/sdb2           32768      524287      245760   83  Linux

    Command (m for help): t
    Partition number (1-4): 1

    Hex code (type L to list codes): b
    Changed system type of partition 1 to b (W95 FAT32)

    Command (m for help): w
    The partition table has been altered!

    Calling ioctl() to re-read partition table.
    ```
7.  format partitions
    - `sudo mkfs.vfat /dev/sdb1`
        - use /dev/mmcblk0p1 or similar if uSD card device is mmcblk0
    - `sudo mkfs.ext4 /dev/sdb2`
        - use /dev/mmcblk0p2 or similar if uSD card device is mmcblk0
8.  mount the new partitions
    - `sudo mkdir /mnt/vfat /mnt/ext4`
    - `sudo mount -t vfat /dev/sdb1 /mnt/vfat`
    - `sudo mount -t ext4 /dev/sdb2 /mnt/ext4`

### install u-boot and kernel
1.  `sudo dd if=u-boot-sunxi-with-spl.bin of=/dev/sdb bs=1024 seek=8`
2.  copy over u-boot uEnv.txt
    - `sudo cp ~/dapper-hw/uEnv.txt /mnt/vfat/`
3.  copy over script.bin
    - `sudo cp pcduino-buildout/script.bin /mnt/vfat/`
4.  copy over uImage
    - `sudo cp pcduino-buildout/uImage /mnt/vfat/`

### install rootfs
0.  ensure the sdcard partitions are mounted (they should be from the previous steps)
    - `sudo mount`
    - if not present, then
        - `mkdir /mnt/vfat /mnt/ext4`
        - `sudo mount -t vfat /dev/sdb1 /mnt/vfat`
        - `sudo mount -t ext4 /dev/sdb2 /mnt/ext4`
1.  `sudo tar --strip-components=1 --show-transformed-names -C /mnt/ext4/ -zvxpf linaro-trusty-alip-20140821-681.tar.gz`

### install modules and firmware
1.  `sudo cp -rfv ~/linux-sunxi/rootfs/lib/ /mnt/ext4/lib/`
2.  `sudo mkdir -p /mnt/ext4/lib/rtlwifi/firmware`
3.  `sudo cp -rfv ~/rtl8188eu/rtl8188eufw.bin /mnt/ext4/lib/rtlwifi/firmware/`

## os setup

1.  enable hardline ethernet
    - on your host machine, configure kermit to use the ftdi-usb cable as described earlier
        - `kermit`
        - `kermit> connect`
    - you should now have a root session on the gcs box
    - from the ftdi-usb terminal provided by kermit, do the following
        - add the interface
        ```bash
        sudo vi /etc/network/interface

        auto eth0
        iface eth0 inet dhcp
        ```
        - `sudo ifup eth0`
        - `sudo ifconfig`
            - look for the ip address: eg 192.168.1.105
2.  update system time
    - `ntpdate ntp.ubuntu.com pool.ntp.org`
3.  now from a terminal in your main machine, ssh into the gcs box
    - `ssh linaro@192.168.1.105`
        - pw: linaro
4.  install system requirements
    - clean apt cache: `rm /var/cache/apt/*.bin`
    - `sudo apt-get install git vim dstat bash-completion build-essential python-dev python-setuptools python-pip python-smbus gpsd gpsd-clients -y`

5.  change wifi to be AP
    - `sudo vi  /etc/udev/rules.d/70-persistent-net.rules`
        - Replace the mac address with asterisk ‘*’, and remove all others.
        ```bash
        # USB device 0x0bda:0x8176 (usb)
        SUBSYSTEM=="net", ACTION=="add", DRIVERS=="?*", ATTR{address}=="*", ATTR{dev_id}
        =="0x0", ATTR{type}=="1", KERNEL=="wlan*", NAME="wlan0"
        ```
        - Reboot pcDuino, and we find that there is only one possibility: wlan0 
    - to use wlan0 as a gateway, set wlan0 as static ip
        - edit `/etc/network/interfaces`
        ```bash
        auto wlan0
        iface wlan0 inet static
            address 192.168.100 .1
            netmask 255.255.255.0
        ```
    - build and install wireless driver
        - `cd ~`
        - `lsmod`
            - look to see that 8188eu is present
        - `sudo modprobe -r 8188eu`
            - run lsmod again to verify it was unloaded
        - delete the original module
            - `sudo rm /lib/modules/3.4.79+/kernel/drivers/net/wireless/rtl8188eu/8188eu.ko`
        - `sudo apt-get install libssl-dev pcduino-linux-headers-3.4.79+`
        - `git clone https://github.com/lwfinger/rtl8188eu.git`
        - `cd rtl8188eu`
        - `vim Makefile`
            - add above line 17: `CONFIG_AP_MODE = y`
        - `sudo make -j3 install`
        - `sudo mv /lib/modules/3.4.79+/kernel/drivers/net/wireless/8188eu.ko /lib/modules/3.4.79+/kernel/drivers/net/wireless/rtl8188eu/8188eu.ko`
        - `sudo modprobe 8188eu`
        - `lsmod`
            - 8188eu should be present near the top
    - build and install hostapd
        - still in lwfinger repo
        - `cd hostapd-0.8/hostapd`
        - `cp defconfig .config`
        - `make -j3`
        - create a local hostapd-test.conf file
            - vim hostapd-test.conf
            ```bash
            interface=wlan0
            ssid=gcs
            channel=1
            auth_algs=1
            driver=rtl871xdrv
            ieee80211n=1
            hw_mode=g
            wmm_enabled=0
            ```
            - test with `sudo ./hostapd -dd ./hostapd-test.conf`
        - `sudo make install`
        - `cd ~`
        - `git clone https://github.com/jenssegers/RTL8188-hostapd`
        - `cd ~/RTL8188-hostapd`
        - `sudo cp scripts/init /etc/init.d/hostapd`
        - `sudo mkdir /etc/hostapd`
        - `sudo cp ~/rtl8188eu/hostapd-0.8/hostapd/hostapd-test.conf /etc/hostapd/hostapd.conf`
        - test with `sudo hostapd -dd /etc/hostapd/hostapd.conf`
        - `sudo chmod a+x /etc/init.d/hostapd`
        - `sudo update-rc.d hostapd defaults`
        - `sudo update-rc.d hostapd enable`
6. install nodejs from source.
    - `wget http://nodejs.org/dist/v0.10.22/node-v0.10.22.tar.gz`
    - `tar xzvf node-v0.10.22.tar.gz && cd node-v0.10.22`
    - `./configure --without-snapshot`
    - `make && sudo make install`
    - `sudo npm install -g grunt-cli bower forever nodemon`
    - `sudo rm -rf tmp`

7.  check that our 3dr radio is up
    - `sudo lsmod`
    - `sudo lsusb`
        - should see ftdi device
8.  set hostname
    - `sudo vim /etc/hostname`
        - gcs or gcs0001
    - `sudo vim /etc/hosts`
        - same as above
9.  configure avahi-daemon
    - `sudo update-rc.d avahi-daemon defaults`
    - `sudo update-rc.d avahi-daemon enable`
    - copy over afpd.service from dapper-hw
        - `cp ~/dapper-hw/afpd.service /etc/avahi/services/afpd.service`
    - Restart Avahi: `sudo /etc/init.d/avahi-daemon restart`
10.  edit gpsd
    ```bash
    ubuntu@arm:~$ sudo dpkg-reconfigure gpsd
    ubuntu@arm:~$ cat /etc/default/gpsd

    # Default settings for gpsd.
    # Please do not edit this file directly - use `dpkg-reconfigure gpsd' to
    # change the options.
    START_DAEMON="true"
    GPSD_OPTIONS="-n -G"
    DEVICES="/dev/ttyS1"
    BAUDRATE="9600"
    USBAUTO="false"
    GPSD_SOCKET="/var/run/gpsd.sock"
    ```
11.  copy over keys and verify
    - `scp ~/.ssh/github-keys* linaro@gcs:/home/linaro/.ssh/`
    - if no .ssh folder is on the gcs side
        - follow the guide from [github](https://help.github.com/articles/generating-ssh-keys)
        - or quickly generate a pair on the gcs then delete them
        - `ssh-keygen -t rsa`
            - choose defaults, no password
        - `rm .ssh/id_rsa*`
        - now scp the keys over
    - test that you can connect to github
        - `ssh -T git@github.com`
12.  clone repo
    `git clone git@github.com:arctic-fire-development/dapper-gcs.git`
    ```bash
    cd dapper-gcs
    git submodule init
    git submodule update
    npm install
    bower install
    grunt
    ```
13.  copy over the upstart script
    - `sudo cp dapper-gcs.conf /etc/init/`
    - `sudo start dapper-gcs`
14.  copy the script.bin into the boot directory
    - this turns off many coponents not used and enables a few we need like UART2
    - determine where the boot partition is mounted
        - `sudo mount`
        - look for something like this:
        - `/dev/mmcblk0p1 on /media/5E9E-BDAB type vfat`
    - `sudo cd script.bin /media/5E9E-BDAB/`
    - `sudo reboot`

### Backup and Restore SD Card with OS X

####Backup

1. Insert sd card to be cloned from
2. use `diskutil list` to find it
    - eg. /dev/disk2
3. `sudo dd if=/dev/disk2 of=~/Desktop/afdc-pcduino-06Oct2014.dmg`
4. 15+ minutes later it should finish
    ```bash
    15130624+0 records in
    15130624+0 records out
    7746879488 bytes transferred in 915.097360 secs (8465634 bytes/sec)
    ```

####Restore

1. Insert sd card to be cloned to
2. use diskutil to format it to msdos
    - note the disk number, eg. /dev/disk2
3. `sudo dd if=~/Desktop/afdc-pcduino-06Oct2014.dmg of=/dev/disk2`

### GPIO Notes
- GPIO 7 and 8 are used for wifi, so we're not able to use the gps shield in it's current form
    - need to run a wire from rx/tx breakout to gpio 0 & 1

### GPS PPS notes
- http://www.lammertbies.nl/comm/info/GPS-time.html

references
- [clean build of uSD card]()
- [wifi ap mode](http://forum.odroid.com/viewtopic.php?f=52&t=1674)
- [usb otg to host](http://learn.linksprite.com/pcduino/usb-development/turn-usb-otg-port-into-an-extra-usb-host-pcduino3/)
- [pinouts](http://learn.linksprite.com/pcduino/arduino-ish-program/uart/how-to-directly-manupilate-uart-of-pcduino-under-linux/)
- [1. axp209 power management unit](http://learn.linksprite.com/pcduino/arduino-ish-program/adc/axp-209-internal-temperature/)
- [2. axp209 pmu kernel inclusion](https://github.com/linux-sunxi/linux-sunxi/commit/fcec507519157765c689ab3473a9e72d8b6df453)
- [external interrupts](http://pcduino.com/forum/index.php?topic=4727.0)
- [upstart script](http://unix.stackexchange.com/questions/84252/how-to-start-a-service-automatically-when-ubuntu-starts)
- [kernel build](http://www.crashcourse.ca/wiki/index.php/Building_kernel_out_of_tree)
- [A20 PIO Guide](http://linux-sunxi.org/A20/PIO)
