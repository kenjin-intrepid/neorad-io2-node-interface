#!/bin/bash

#sudo apt-get install libudev-dev -y
cd /etc/udev/rules.d
sudo touch 99-hidraw-permissions.rules
echo 'KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0666"' >> 99-hidraw-permissions.rules
echo "hid rules created in /etc/udev/rules.d/"