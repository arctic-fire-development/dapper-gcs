#!/usr/bin/env bash
# download u-boot, kernel, rootfs, wireless AP daemon, sunxi tools and boards

git clone https://github.com/jwrdegoede/u-boot-sunxi.git  -b sunxi-next
git clone https://github.com/linux-sunxi/linux-sunxi -b sunxi-next
wget http://releases.linaro.org/14.09/ubuntu/trusty-images/nano/linaro-trusty-nano-20140922-682.tar.gz
git clone https://github.com/lwfinger/rtl8188eu
git clone git://github.com/linux-sunxi/sunxi-tools.git
git clone git://github.com/linux-sunxi/sunxi-boards.git
