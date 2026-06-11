const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js dev server...`);
  const server = spawn('node', [path.join(__dirname, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
    cwd: __dirname,
    env: { ...process.env },
    stdio: 'inherit'
  });

  server.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  server.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 5000);
  });
}

startServer();

// Keep the wrapper alive
setInterval(() => {
  // heartbeat
}, 30000);
