#!/usr/bin/env node

/**
 * Monitor Joanna@ Scan Progress
 * Shows real-time progress of the comprehensive scan
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

async function monitorProgress() {
  console.log('📊 Monitoring Joanna@ Scan Progress...\n');

  let lastCount = 0;
  let startTime = Date.now();

  while (true) {
    try {
      // Get current stake count
      const result = await pool.query(
        `
        SELECT 
          COUNT(*) as total_stakes,
          MIN(block_height) as first_block,
          MAX(block_height) as last_block,
          SUM(amount_sats) as total_sats,
          MAX(block_time) as last_time
        FROM staking_rewards 
        WHERE identity_address = $1
      `,
        [JOANNA_IADDR]
      );

      const current = result.rows[0];
      const currentCount = parseInt(current.total_stakes);
      const newStakes = currentCount - lastCount;

      // Calculate scan progress
      const currentHeight = 3768000; // Approximate current blockchain height
      const scanStart = 800200; // VerusID activation block
      const totalBlocksToScan = currentHeight - scanStart;
      const blocksScanned = current.last_block - scanStart;
      const progressPercent = Math.min(
        100,
        (blocksScanned / totalBlocksToScan) * 100
      );

      console.clear();
      console.log('🔍 Joanna@ Comprehensive Scan Monitor');
      console.log('=====================================\n');

      console.log(`📊 Current Status:`);
      console.log(`  Total Stakes: ${currentCount.toLocaleString()}`);
      console.log(`  New Since Last Check: ${newStakes}`);
      console.log(
        `  Block Range: ${current.first_block} to ${current.last_block}`
      );
      console.log(
        `  Total Rewards: ${(current.total_sats / 100000000).toFixed(2)} VRSC`
      );
      console.log(`  Last Stake: ${new Date(current.last_time).toISOString()}`);

      console.log(`\n📈 Scan Progress:`);
      console.log(
        `  Blocks Scanned: ${blocksScanned.toLocaleString()} / ${totalBlocksToScan.toLocaleString()}`
      );
      console.log(`  Progress: ${progressPercent.toFixed(1)}%`);
      console.log(
        `  Estimated Completion: ${Math.round((100 - progressPercent) * 2)} minutes remaining`
      );

      if (newStakes > 0) {
        console.log(`\n🆕 New Stakes Found: ${newStakes}`);
      }

      console.log(
        `\n⏰ Monitoring for ${Math.round((Date.now() - startTime) / 1000)} seconds`
      );
      console.log('Press Ctrl+C to stop monitoring\n');

      lastCount = currentCount;

      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`❌ Monitor error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Stopping monitor...');
  await pool.end();
  process.exit(0);
});

// Start monitoring
monitorProgress().catch(console.error);
