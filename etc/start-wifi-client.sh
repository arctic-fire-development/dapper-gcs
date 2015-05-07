#!/bin/sh

echo "stopping wifi ap";
systemctl stop hostapd.service;
sleep 2;
echo "starting wifi client";
systemctl start wpa_supplicant.service;
sleep 2;
configure_edison --wifi && curl -4 icanhazip.com;
echo "wifi client is up";
