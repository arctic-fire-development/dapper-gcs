# Build Linux for microSD FROM SCRATCH

All steps performed are done on 32bit ubuntu distribution

0. prerequisites

    ```bash
    ubuntu@mint17:~$ sudo apt-get install git device-tree-compiler lzma lzop u-boot-tools libncurses5-dev
    ```

1. Grab the ARM cross compiler
    
    ```bash
    wilsonrm@mint17 ~ $ sudo apt-get install libc6-dev-i386 lib32stdc++-4.8-dev
    wilsonrm@mint17 ~ $ wget -c https://releases.linaro.org/latest/components/toolchain/binaries/gcc-linaro-arm-linux-gnueabihf-4.9-2014.08_linux.tar.xz
    wilsonrm@mint17 ~ $ tar xf gcc-linaro-arm-linux-gnueabihf-4.9-2014.08_linux.tar.xz
    wilsonrm@mint17 ~ $ export CC=`pwd`/gcc-linaro-arm-linux-gnueabihf-4.9-2014.08_linux/bin/arm-linux-gnueabihf-
    ```
    
    verify it works
    
    ```bash
    wilsonrm@mint17 ~ $ ${CC}gcc --version
    arm-linux-gnueabihf-gcc (crosstool-NG linaro-1.13.1-4.9-2014.08 - Linaro GCC 4.9-2014.08) 4.9.2 20140811 (prerelease)
    Copyright (C) 2014 Free Software Foundation, Inc.
    This is free software; see the source for copying conditions.  There is NO
    warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
    ```

2. u-Boot
    Das U-Boot -- the Universal Boot Loader [http://www.denx.de/wiki/U-Boot](http://www.denx.de/wiki/U-Boot)
    
    Download:

    ```bash
    wilsonrm@mint17 ~ $ git clone git://git.denx.de/u-boot.git
    wilsonrm@mint17 ~ $ cd u-boot/
    wilsonrm@mint17 ~/u-boot $ git checkout v2014.07 -b tmp
    ```

    Patches:

    ```bash
    wilsonrm@mint17 ~/u-boot $ wget -c https://raw.githubusercontent.com/eewiki/u-boot-patches/master/v2014.07/0001-am335x_evm-uEnv.txt-bootz-n-fixes.patch
    wilsonrm@mint17 ~/u-boot $ patch -p1 < 0001-am335x_evm-uEnv.txt-bootz-n-fixes.patch
    ```

    Configure and Build:

    ```bash
    wilsonrm@mint17 ~/u-boot $ make ARCH=arm CROSS_COMPILE=${CC} distclean
    wilsonrm@mint17 ~/u-boot $ make ARCH=arm CROSS_COMPILE=${CC} am335x_evm_config
    wilsonrm@mint17 ~/u-boot $ make ARCH=arm CROSS_COMPILE=${CC}
    ```

3. Upgrade distro "device-tree-compiler" package

    ```bash
    wilsonrm@mint17 ~/u-boot $ cd ~
    wilsonrm@mint17 ~ $ wget -c https://raw.github.com/RobertCNelson/tools/master/pkgs/dtc.sh
    wilsonrm@mint17 ~ $ chmod +x dtc.sh
    wilsonrm@mint17 ~ $ ./dtc.sh
    ```

4. Linux Kernel

    ```bash
    wilsonrm@mint17 ~ $ git clone https://github.com/RobertCNelson/bb-kernel.git
    wilsonrm@mint17 ~ $ cd bb-kernel/
    wilsonrm@mint17 ~/bb-kernel $ git checkout origin/am33x-v3.16 -b tmp
    wilsonrm@mint17 ~/bb-kernel $ ./build_kernel.sh
    ```

5. Ubuntu

    user: ubuntu
    password: temppwd

    Download and extract:

    ```bash
    wilsonrm@mint17 ~/bb-kernel $ cd ~
    wilsonrm@mint17 ~ $ wget -c https://rcn-ee.net/deb/minfs/trusty/ubuntu-14.04-minimal-armhf-2014-07-07.tar.xz
    wilsonrm@mint17 ~ $ tar xf ubuntu-14.04-minimal-armhf-2014-07-07.tar.xz
    ```
