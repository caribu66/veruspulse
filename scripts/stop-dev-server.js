#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCK_FILE = path.join(__dirname, '..', '.dev-server.lock');

function killZombieWorkers() {
  try {
    // Kill zombie jest-worker processes
    execSync('pkill -9 -f "jest-worker/processChild" 2>/dev/null || true', {
      stdio: 'inherit',
    });
  } catch (err) {
    // Ignore errors - processes may not exist
  }
}

function stopDevServer() {
  if (!fs.existsSync(LOCK_FILE)) {
    console.log(
      'ℹ️  No dev server lock file found. Server may not be running.'
    );
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

      // Kill any zombie worker processes
      console.log('🧹 Cleaning up zombie worker processes...');
      killZombieWorkers();
    } catch (err) {
      if (err.code === 'ESRCH') {
        // Process doesn't exist, just remove stale lock file
        console.log(
          'ℹ️  Process not found (may have already stopped). Cleaning up lock file...'
        );
        fs.unlinkSync(LOCK_FILE);

        // Still clean up zombies
        killZombieWorkers();
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('❌ Error stopping dev server:', err.message);
    // Try to clean up zombies anyway
    killZombieWorkers();
    process.exit(1);
  }
}

stopDevServer();
