#!/bin/bash
while true; do
  cd /home/z/my-project
  node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
