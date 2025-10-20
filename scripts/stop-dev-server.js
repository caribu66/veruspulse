#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '..', '.dev-server.lock');

function stopDevServer() {
  if (!fs.existsSync(LOCK_FILE)) {
    console.log('ℹ️  No dev server lock file found. Server may not be running.');
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    
    console.log(`🔍 Found dev server with PID: ${pid}`);
    
    try {
      // Try to kill the process
      process.kill(pid, 'SIGTERM');
      console.log('✅ Dev server stopped successfully!');
      
      // Remove lock file
      fs.unlinkSync(LOCK_FILE);
    } catch (err) {
      if (err.code === 'ESRCH') {
        // Process doesn't exist, just remove stale lock file
        console.log('ℹ️  Process not found (may have already stopped). Cleaning up lock file...');
        fs.unlinkSync(LOCK_FILE);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('❌ Error stopping dev server:', err.message);
    process.exit(1);
  }
}

stopDevServer();

