#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const LOCK_FILE = path.join(__dirname, '..', '.dev-server.lock');

/**
 * Check if a port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
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
function isDevServerRunning() {
  if (!fs.existsSync(LOCK_FILE)) {
    return false;
  }
  
  try {
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    
    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists without killing it
      return true;
    } catch (e) {
      // Process doesn't exist, remove stale lock file
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
  } catch (err) {
    // Error reading lock file, assume it's corrupted and remove it
    fs.unlinkSync(LOCK_FILE);
    return false;
  }
}

/**
 * Create lock file with current process PID
 */
function createLockFile(pid) {
  fs.writeFileSync(LOCK_FILE, pid.toString(), 'utf8');
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
 * Start the Next.js dev server
 */
async function startDevServer() {
  console.log('🔍 Checking if port 3000 is available...\n');
  
  // Check if another instance is already running
  if (isDevServerRunning()) {
    console.error('❌ ERROR: A dev server is already running on port 3000!');
    console.error('');
    console.error('   To stop the existing server:');
    console.error('   1. Find the process: ps aux | grep "next dev"');
    console.error('   2. Kill it: kill <PID>');
    console.error('   3. Or use: killall -9 node');
    console.error('');
    process.exit(1);
  }
  
  // Double-check port availability
  const portInUse = await isPortInUse(PORT);
  if (portInUse) {
    console.error('❌ ERROR: Port 3000 is already in use!');
    console.error('');
    console.error('   Please stop any application using port 3000:');
    console.error('   • Check with: lsof -i :3000');
    console.error('   • Or: netstat -tlnp | grep 3000');
    console.error('');
    process.exit(1);
  }
  
  console.log('✅ Port 3000 is available. Starting dev server...\n');
  
  // Start the Next.js dev server (bind to all interfaces for network access)
  const devProcess = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Create lock file with the child process PID
  createLockFile(devProcess.pid);
  
  // Clean up lock file when process exits
  const cleanup = () => {
    removeLockFile();
  };
  
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping dev server...');
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  
  devProcess.on('error', (err) => {
    console.error('Failed to start dev server:', err);
    cleanup();
    process.exit(1);
  });
  
  devProcess.on('exit', (code) => {
    cleanup();
    process.exit(code || 0);
  });
}

// Start the server
startDevServer().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

