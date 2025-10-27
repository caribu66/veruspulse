#!/usr/bin/env node
/**
 * auto-recalculate-stats.js
 * Automatically recalculates VerusID statistics at regular intervals
 *
 * This script ensures that the verusid_statistics table stays up-to-date
 * with the latest staking data from staking_rewards table.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LOG_FILE = path.join(__dirname, '..', 'logs', 'auto-stats-recalc.log');
const LOCK_FILE = path.join(__dirname, '..', 'logs', 'stats-recalc.lock');

let isRunning = false;
let intervalId = null;

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

function createLockFile() {
  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({
      pid: process.pid,
      started: new Date().toISOString(),
      status: 'running',
    })
  );
}

function removeLockFile() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

function checkLockFile() {
  if (!fs.existsSync(LOCK_FILE)) {
    return false;
  }

  try {
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const lockTime = new Date(lockData.started).getTime();
    const now = Date.now();
    const lockAge = now - lockTime;

    // If lock is older than 2 hours, consider it stale and remove it
    if (lockAge > 2 * 60 * 60 * 1000) {
      log(
        `⚠️  Removing stale lock file (age: ${Math.round(lockAge / 1000 / 60)} minutes)`
      );
      removeLockFile();
      return false;
    }

    return true;
  } catch (error) {
    log(`⚠️  Error reading lock file: ${error.message}`);
    removeLockFile();
    return false;
  }
}

async function runStatisticsRecalculation() {
  if (isRunning) {
    log('⏳ Statistics recalculation already in progress, skipping...');
    return;
  }

  if (checkLockFile()) {
    log('🔒 Another statistics recalculation is running, skipping...');
    return;
  }

  try {
    isRunning = true;
    createLockFile();

    log('🔄 Starting automatic statistics recalculation...');
    const startTime = Date.now();

    // Run the statistics recalculation script
    const { stdout, stderr } = await execAsync(
      './scripts/recalculate-stats.sh'
    );

    const duration = Math.round((Date.now() - startTime) / 1000);

    if (stdout.includes('✅ Statistics updated!')) {
      log(`✅ Statistics recalculation completed successfully in ${duration}s`);

      // Parse and log key statistics
      const lines = stdout.split('\n');
      const summaryLine = lines.find(line => line.includes('verusids'));
      if (summaryLine) {
        log(`📊 ${summaryLine.trim()}`);
      }
    } else {
      log(
        `⚠️  Statistics recalculation completed with warnings in ${duration}s`
      );
    }

    if (stderr) {
      log(`⚠️  Warnings: ${stderr}`);
    }
  } catch (error) {
    log(`❌ Statistics recalculation failed: ${error.message}`);

    // Log the full error for debugging
    if (error.stdout) {
      log(`STDOUT: ${error.stdout}`);
    }
    if (error.stderr) {
      log(`STDERR: ${error.stderr}`);
    }
  } finally {
    isRunning = false;
    removeLockFile();
  }
}

async function startAutoRecalculation() {
  log('🚀 Starting automatic statistics recalculation service...');
  log(`📅 Update interval: ${UPDATE_INTERVAL / 1000 / 60} minutes`);

  // Run immediately on startup
  await runStatisticsRecalculation();

  // Set up interval for regular updates
  intervalId = setInterval(async () => {
    await runStatisticsRecalculation();
  }, UPDATE_INTERVAL);

  log('✅ Auto-recalculation service started successfully');
}

function stopAutoRecalculation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  removeLockFile();
  log('🛑 Auto-recalculation service stopped');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Received SIGINT, shutting down gracefully...');
  stopAutoRecalculation();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Received SIGTERM, shutting down gracefully...');
  stopAutoRecalculation();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  log(`💥 Uncaught exception: ${error.message}`);
  log(`Stack: ${error.stack}`);
  stopAutoRecalculation();
  process.exit(1);
});

// Start the service
if (require.main === module) {
  startAutoRecalculation().catch(error => {
    log(`💥 Failed to start auto-recalculation service: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  startAutoRecalculation,
  stopAutoRecalculation,
  runStatisticsRecalculation,
};
