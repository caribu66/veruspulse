#!/usr/bin/env node
/**
 * monitor-pos-index.js
 * Real-time monitoring of PoS block index building progress
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

let lastPosBlocks = 0;
let lastCheckTime = Date.now();

async function monitor() {
  try {
    // Get index statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_pos_blocks,
        MIN(block_height) as first_block,
        MAX(block_height) as last_block,
        MAX(indexed_at) as last_indexed_time
      FROM pos_blocks
    `);

    const data = stats.rows[0];
    const totalPosBlocks = parseInt(data.total_pos_blocks);
    const firstBlock = parseInt(data.first_block);
    const lastBlock = parseInt(data.last_block);
    const lastIndexedTime = data.last_indexed_time;

    // Calculate progress
    const targetHeight = 3617199; // Current blockchain height
    const totalBlocksToScan = targetHeight - 800200;
    const blocksScanned = lastBlock - firstBlock;
    const progress = ((blocksScanned / totalBlocksToScan) * 100).toFixed(2);

    // Calculate rate
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastCheckTime) / 1000; // seconds
    const blocksDiff = totalPosBlocks - lastPosBlocks;
    const rate = timeDiff > 0 ? (blocksDiff / timeDiff).toFixed(1) : 0;

    // Calculate ETA
    const remainingBlocks = targetHeight - lastBlock;
    const blocksPerSecond = rate > 0 ? parseFloat(rate) : 0;
    const etaSeconds =
      blocksPerSecond > 0 ? remainingBlocks / blocksPerSecond : 0;
    const etaMinutes = Math.round(etaSeconds / 60);
    const etaHours = (etaMinutes / 60).toFixed(1);

    // PoS percentage
    const posPercentage =
      blocksScanned > 0
        ? ((totalPosBlocks / blocksScanned) * 100).toFixed(1)
        : 0;

    // Clear screen and show stats
    console.clear();
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║   PoS Block Index Builder - LIVE MONITOR                 ║');
    console.log(
      '╚═══════════════════════════════════════════════════════════╝\n'
    );

    console.log('📊 INDEX STATISTICS:');
    console.log(`   PoS blocks indexed: ${totalPosBlocks.toLocaleString()}`);
    console.log(`   Current height: ${lastBlock.toLocaleString()}`);
    console.log(`   Target height: ${targetHeight.toLocaleString()}`);
    console.log(
      `   Range: ${firstBlock.toLocaleString()} → ${lastBlock.toLocaleString()}\n`
    );

    console.log('📈 PROGRESS:');
    console.log(
      `   Blocks scanned: ${blocksScanned.toLocaleString()} / ${totalBlocksToScan.toLocaleString()}`
    );
    console.log(`   Progress: ${progress}%`);
    console.log(
      `   PoS blocks: ${totalPosBlocks.toLocaleString()} (${posPercentage}% of scanned blocks)\n`
    );

    console.log('⚡ PERFORMANCE:');
    console.log(`   Current rate: ${rate} PoS blocks/second`);
    console.log(`   Remaining: ${remainingBlocks.toLocaleString()} blocks`);
    console.log(
      `   ETA: ${etaMinutes.toLocaleString()} minutes (~${etaHours} hours)\n`
    );

    console.log('⏰ TIMING:');
    console.log(
      `   Last indexed: ${lastIndexedTime ? new Date(lastIndexedTime).toLocaleString() : 'N/A'}`
    );
    console.log(`   Current time: ${new Date().toLocaleString()}\n`);

    // Progress bar
    const barLength = 50;
    const filled = Math.round((parseFloat(progress) / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`[${bar}] ${progress}%\n`);

    // Estimated completion
    if (etaMinutes > 0) {
      const completionTime = new Date(Date.now() + etaSeconds * 1000);
      console.log(
        `🎯 Estimated completion: ${completionTime.toLocaleString()}\n`
      );
    }

    // Show expected final numbers
    const expectedPoSBlocks = Math.round(totalBlocksToScan * 0.5);
    console.log('📋 EXPECTED FINAL:');
    console.log(
      `   Total PoS blocks: ~${expectedPoSBlocks.toLocaleString()} (~50% of blocks)`
    );
    console.log(
      `   Current / Expected: ${((totalPosBlocks / expectedPoSBlocks) * 100).toFixed(1)}%\n`
    );

    console.log(
      '💡 TIP: Press Ctrl+C to exit monitor (index will continue building)\n'
    );

    // Update last values for rate calculation
    lastPosBlocks = totalPosBlocks;
    lastCheckTime = currentTime;
  } catch (error) {
    console.error('❌ Monitor error:', error.message);
  }
}

// Monitor every 5 seconds
async function startMonitoring() {
  console.log('Starting PoS index monitor...\n');

  // Initial check
  await monitor();

  // Update every 5 seconds
  const interval = setInterval(async () => {
    await monitor();
  }, 5000);

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    clearInterval(interval);
    console.log(
      '\n\n👋 Monitor stopped. Index builder is still running in background.'
    );
    console.log('📊 Check log with: tail -f pos-index-build.log\n');
    await pool.end();
    process.exit(0);
  });
}

startMonitoring().catch(async error => {
  console.error('Fatal error:', error);
  await pool.end();
  process.exit(1);
});
