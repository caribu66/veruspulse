#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const LOCK_FILE = path.join(__dirname, '..', '.prod-server.lock');
const MODE = process.argv[2] || 'production'; // 'production' or 'development'

/**
 * Check if a port is in use
 */
function isPortInUse(port) {
  return new Promise(resolve => {
    const server = net.createServer();

    server.once('error', err => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

/**
 * Check if lock file exists and if the process is still running
 */
function isServerRunning() {
  if (!fs.existsSync(LOCK_FILE)) {
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const pid = data.pid;

    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists without killing it
      return { running: true, pid, port: data.port, mode: data.mode };
    } catch (e) {
      // Process doesn't exist, remove stale lock file
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
  } catch (err) {
    // Error reading lock file, assume it's corrupted and remove it
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {
      // Ignore
    }
    return false;
  }
}

/**
 * Create lock file with current process PID and port
 */
function createLockFile(pid, port, mode) {
  const lockData = {
    pid: pid,
    port: port,
    mode: mode,
    started: new Date().toISOString(),
  };
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2), 'utf8');
}

/**
 * Remove lock file
 */
function removeLockFile() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (err) {
    // Ignore errors when removing lock file
  }
}

/**
 * Start the Next.js server
 */
async function startServer() {
  console.log(`🔍 Checking if port ${PORT} is available...\n`);

  // Check if another instance is already running
  const serverStatus = isServerRunning();
  if (serverStatus) {
    console.error(
      `❌ ERROR: A ${serverStatus.mode} server is already running!`
    );
    console.error('');
    console.error(`   PID: ${serverStatus.pid}`);
    console.error(`   Port: ${serverStatus.port}`);
    console.error(`   Mode: ${serverStatus.mode}`);
    console.error('');
    console.error('   To stop the existing server:');
    console.error(
      `   1. Use: npm run ${serverStatus.mode === 'development' ? 'dev:stop' : 'stop'}`
    );
    console.error(`   2. Or kill: kill ${serverStatus.pid}`);
    console.error('');
    process.exit(1);
  }

  // Double-check port availability
  const portInUse = await isPortInUse(PORT);
  if (portInUse) {
    console.error(`❌ ERROR: Port ${PORT} is already in use!`);
    console.error('');
    console.error(`   Please stop any application using port ${PORT}:`);
    console.error(`   • Check with: lsof -i :${PORT}`);
    console.error(`   • Or: netstat -tlnp | grep ${PORT}`);
    console.error('');
    process.exit(1);
  }

  console.log(`✅ Port ${PORT} is available. Starting ${MODE} server...\n`);

  // Start the Next.js server (bind to all interfaces for network access)
  const command = MODE === 'production' ? 'next' : 'next';
  const args =
    MODE === 'production'
      ? ['start', '-p', PORT.toString(), '-H', '0.0.0.0']
      : ['dev', '-p', PORT.toString(), '-H', '0.0.0.0'];

  const serverProcess = spawn('npx', [command, ...args], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: PORT.toString() },
  });

  // Create lock file with the child process PID
  createLockFile(serverProcess.pid, PORT, MODE);

  console.log(`\n🚀 ${MODE} server started with PID: ${serverProcess.pid}\n`);

  // Clean up lock file when process exits
  const cleanup = () => {
    removeLockFile();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    console.log(`\n\n🛑 Stopping ${MODE} server...`);
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  serverProcess.on('error', err => {
    console.error(`Failed to start ${MODE} server:`, err);
    cleanup();
    process.exit(1);
  });

  serverProcess.on('exit', code => {
    cleanup();
    process.exit(code || 0);
  });
}

// Start the server
startServer().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
