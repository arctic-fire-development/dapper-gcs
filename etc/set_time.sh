#!/bin/sh

# update local time to UTC
TM=$(curl -s http://www.timeapi.org/utc/now?format=%25Y-%25m-%25d+%25H:%25M)
echo $TM
date -s "${TM}"
