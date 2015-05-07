#!/bin/sh

echo "stopping wifi client";
systemctl stop wpa_supplicant.service;
sleep 2;
echo "starting wifi ap";
systemctl start hostapd.service;
echo "wifi ap is up";
