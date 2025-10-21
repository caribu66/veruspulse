#!/usr/bin/env node
/**
 * Process Lock Utility
 * Provides a reusable mechanism to prevent duplicate process instances
 */

const fs = require('fs');
const path = require('path');

class ProcessLock {
  constructor(lockFileName, processName = 'process') {
    this.lockFile = path.join(__dirname, '../..', `.${lockFileName}.lock`);
    this.processName = processName;
  }

  /**
   * Check if process is already running
   * @returns {Object|false} Process info if running, false otherwise
   */
  isRunning() {
    if (!fs.existsSync(this.lockFile)) {
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      const pid = data.pid;

      // Check if process is still running
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists without killing it
        return data;
      } catch (e) {
        // Process doesn't exist, remove stale lock file
        this.removeLock();
        return false;
      }
    } catch (err) {
      // Error reading lock file, assume it's corrupted and remove it
      this.removeLock();
      return false;
    }
  }

  /**
   * Create lock file with process information
   * @param {Object} info - Process information (pid, port, etc.)
   */
  createLock(info = {}) {
    const lockData = {
      pid: info.pid || process.pid,
      processName: this.processName,
      started: new Date().toISOString(),
      ...info,
    };

    try {
      fs.writeFileSync(
        this.lockFile,
        JSON.stringify(lockData, null, 2),
        'utf8'
      );
      return true;
    } catch (err) {
      console.error(`Failed to create lock file: ${err.message}`);
      return false;
    }
  }

  /**
   * Remove lock file
   */
  removeLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
      return true;
    } catch (err) {
      console.error(`Failed to remove lock file: ${err.message}`);
      return false;
    }
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanup() {
    const cleanup = () => {
      this.removeLock();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
  }

  /**
   * Stop a running process
   * @param {string} signal - Signal to send (default: SIGTERM)
   * @returns {boolean} Success
   */
  stop(signal = 'SIGTERM') {
    const processInfo = this.isRunning();

    if (!processInfo) {
      console.log(`ℹ️  No ${this.processName} is currently running.`);
      return false;
    }

    try {
      process.kill(processInfo.pid, signal);
      console.log(
        `✅ ${this.processName} (PID: ${processInfo.pid}) stopped successfully!`
      );
      this.removeLock();
      return true;
    } catch (err) {
      if (err.code === 'ESRCH') {
        console.log(
          `ℹ️  Process not found (may have already stopped). Cleaning up lock file...`
        );
        this.removeLock();
        return true;
      } else {
        console.error(`❌ Error stopping ${this.processName}:`, err.message);
        return false;
      }
    }
  }
}

module.exports = ProcessLock;
