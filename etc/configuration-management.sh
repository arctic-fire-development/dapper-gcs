#!/bin/sh

git log --oneline -n 1 | cut -f1 -d' ';
node -v;
npm -v;
bower --version;
grunt --version;
uname -a | cut -f3 -d' ';
cat /etc/version;
