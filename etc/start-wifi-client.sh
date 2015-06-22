#!/bin/sh

echo "stopping wifi ap";
systemctl stop hostapd.service;

echo "starting wifi client";
systemctl start wpa_supplicant.service;

configure_edison --wifi && curl -4 icanhazip.com;
echo "wifi client is up";
