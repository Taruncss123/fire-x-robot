const { spawn } = require('child_process');
const path = require('path');

console.log("==================================================================");
console.log("🚀 STARTING FIRE-X COMMAND CENTER (BACKEND + FRONTEND)");
console.log("==================================================================");

// Start Backend (Express + WS on port 5001)
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Start Frontend (Next.js on port 3000)
const frontend = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log("\nShutting down FIRE-X servers...");
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
