#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
  node server.js 2>&1
  echo "[$(date)] Server exited, restarting..." >&2
  sleep 2
done
