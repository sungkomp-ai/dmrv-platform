const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  const server = spawn('node', ['server.js'], {
    cwd: '/home/z/my-project/.next/standalone',
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit'
  });
  
  server.on('exit', (code, signal) => {
    console.log(`Server exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

startServer();

// Keep the wrapper alive
setInterval(() => {
  // heartbeat
}, 30000);
