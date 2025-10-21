#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEV_LOCK_FILE = path.join(__dirname, '..', '.dev-server.lock');
const PROD_LOCK_FILE = path.join(__dirname, '..', '.prod-server.lock');

function readLockFile(lockFile) {
  if (!fs.existsSync(lockFile)) {
    return null;
  }

  try {
    const data = fs.readFileSync(lockFile, 'utf8');
    // Try parsing as JSON first (new format)
    try {
      return JSON.parse(data);
    } catch (e) {
      // Fallback to old format (just PID)
      return { pid: parseInt(data.trim(), 10) };
    }
  } catch (err) {
    return null;
  }
}

function stopServer(lockFile, serverType) {
  const lockData = readLockFile(lockFile);

  if (!lockData) {
    console.log(
      `ℹ️  No ${serverType} server lock file found. Server may not be running.`
    );
    return false;
  }

  const pid = lockData.pid;
  console.log(`🔍 Found ${serverType} server with PID: ${pid}`);

  try {
    // Try to kill the process
    process.kill(pid, 'SIGTERM');
    console.log(`✅ ${serverType} server stopped successfully!`);

    // Remove lock file
    fs.unlinkSync(lockFile);
    return true;
  } catch (err) {
    if (err.code === 'ESRCH') {
      // Process doesn't exist, just remove stale lock file
      console.log(
        `ℹ️  Process not found (may have already stopped). Cleaning up lock file...`
      );
      try {
        fs.unlinkSync(lockFile);
      } catch (e) {
        // Ignore
      }
      return true;
    } else {
      console.error(`❌ Error stopping ${serverType} server:`, err.message);
      return false;
    }
  }
}

function stopAllServers() {
  console.log('🔍 Checking for running servers...\n');

  let devStopped = false;
  let prodStopped = false;

  // Check for development server
  if (fs.existsSync(DEV_LOCK_FILE)) {
    devStopped = stopServer(DEV_LOCK_FILE, 'development');
    console.log('');
  }

  // Check for production server
  if (fs.existsSync(PROD_LOCK_FILE)) {
    prodStopped = stopServer(PROD_LOCK_FILE, 'production');
    console.log('');
  }

  if (!devStopped && !prodStopped) {
    console.log('ℹ️  No servers appear to be running.');
    console.log('');
    console.log('💡 To check manually:');
    console.log('   ps aux | grep "next dev\\|next start"');
  }
}

stopAllServers();
