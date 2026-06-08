#!/bin/bash
cd /home/z/my-project/.next/standalone
node server.js &
SERVER_PID=$!
echo "Server started: $SERVER_PID"
# Keep this script running forever
while true; do
  sleep 60
done
