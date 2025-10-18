#!/usr/bin/env node
/**
 * auto-update-utxos.js
 * Automatically updates UTXO statistics every few minutes
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes (reduced for more frequent updates)
let isRunning = false;

async function runUTXOUpdate() {
  if (isRunning) {
    console.log('⏳ Update already in progress, skipping...');
    return;
  }

  try {
    isRunning = true;
    console.log(
      `\n🔄 Auto-updating UTXO statistics at ${new Date().toLocaleString()}`
    );

    const { stdout, stderr } = await execAsync(
      'node scripts/update-utxo-statistics.js'
    );

    if (stdout.includes('UTXO UPDATE COMPLETE')) {
      console.log('✅ UTXO statistics updated successfully');

      // Parse and show key stats
      const lines = stdout.split('\n');
      const summaryLine = lines.find(line =>
        line.includes('VerusIDs processed:')
      );
      if (summaryLine) {
        console.log(`📊 ${summaryLine.trim()}`);
      }
    }

    if (stderr) {
      console.error('⚠️ Warnings:', stderr);
    }
  } catch (error) {
    console.error('❌ Auto-update failed:', error.message);
  } finally {
    isRunning = false;
  }
}

// Run immediately on startup
console.log('🚀 Starting automatic UTXO updates every 2 minutes...');
runUTXOUpdate();

// Then run every 2 minutes
setInterval(runUTXOUpdate, UPDATE_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping auto-update service...');
  process.exit(0);
});
