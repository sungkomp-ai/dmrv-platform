#!/bin/bash
cd /home/z/my-project/.next/standalone
PORT=3002 node server.js &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID" >> /home/z/my-project/server-status.log

# Keep script running to prevent process group from being killed
while kill -0 $SERVER_PID 2>/dev/null; do
  sleep 5
done
echo "Server died at $(date)" >> /home/z/my-project/server-status.log

# Restart
exec /home/z/my-project/keep-alive.sh
