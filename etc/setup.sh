#!/bin/bash

# Stage 1

Stage1 ()
{
touch setup_in_progress

echo "Configuring Machine"
echo "Here is your ip address"
curl -4 icanhazip.com;

cd

BOOT_SIZE=$(df -h | grep mmcblk0p7 | sed 's/\s\+/ /g' | cut -d' ' -f2 | sed 's/M//g')
echo $BOOT_SIZE
if [[ $BOOT_SIZE < 6.0 ]]; then
  echo "Fixing the boot partition"
  mkdir /tmp/boot;
  cp /boot/* /tmp/boot/;
  umount /boot;
  mkfs.vfat /dev/mmcblk0p7;
  mount /boot;
  cp /tmp/boot/* /boot/;
  df -h;
else
  echo "No need to fix boot"
fi

echo "Setting up Repos"
cat <<EOF > /etc/opkg/base-feeds.conf
src/gz all http://repo.opkg.net/edison/repo/all
src/gz edison http://repo.opkg.net/edison/repo/edison
src/gz core2-32 http://repo.opkg.net/edison/repo/core2-32
EOF

echo "Upgrading system"
opkg update;
opkg upgrade;

echo "Setting up new kernel for next boot"
cd /boot
cp vmlinuz vmlinuz.original.$(configure_edison --version)
cp bzImage* vmlinuz

opkg install kernel-modules
opkg install --force-reinstall kernel-module-bcm4334x
echo "ignore the FATAL, it's ok"

echo "Restarting the system"
echo "Run setup.sh again to continue"
reboot
}

# Stage 2
Stage2 ()
{
echo "Continuing Setup and Installation"
rm setup_in_progress

#let's get back onto the wifi
configure_edison --wifi

echo "creating the log directory /var/log/dapper-gcs"
mkdir -p /var/log/dapper-gcs
chmod 755 /var/log/dapper-gcs

echo "Installing dapper-gcs pre-reqs"
echo "    installing npm@latest"
npm install -g npm@latest
echo "    installing forever bower grunt-cli"
npm install -g forever bower grunt-cli
echo "    installing git"
opkg install git

echo ""
echo "Installing dapper-gcs"
git clone https://github.com/arctic-fire-development/dapper-gcs.git
cd ./dapper-gcs
echo "    config file"
cp config.json.example config.json
echo "    Installing systemd services"
cp dapper-gcs.service /lib/systemd/system/
cp dapper-mapproxy.service /lib/systemd/system/
echo "    npm install"
npm install
echo "    bower install"
bower install --allow-root
echo "    grunt release"
grunt release

echo "Back in the home directory"
cd

echo "Installing mapproxy and friends"
wget https://bootstrap.pypa.io/get-pip.py --no-check-certificate
python get-pip.py
opkg install vim python-imaging python-sqlite3 python-dev libyaml-0-dev libjpeg-dev libz-dev libfreetype6
pip install pyproj PyYAML
pip install MapProxy

echo "Enabling dapper-gcs services"
systemctl stop edison_config.service
systemctl start dapper-mapproxy.service
systemctl start dapper-gcs.service
systemctl enable dapper-mapproxy.service
systemctl enable dapper-gcs.service
systemctl disable edison_config.service

echo "Setting up hostapd"
systemctl stop wpa_supplicant.service
systemctl disable wpa_supplicant.service
systemctl enable hostapd.service
systemctl start hostapd.service

echo ""
echo "All Done"
}

if [ -e ./setup_in_progress ]
	then
    Stage2
	else
	  Stage1
fi
