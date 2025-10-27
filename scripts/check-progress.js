#!/usr/bin/env node
/**
 * check-progress.js
 * Simple one-time progress check (no live monitoring)
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

async function checkProgress() {
  try {
    console.log(
      '\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║   PoS Index Builder - Progress Check                     ║');
    console.log(
      '╚═══════════════════════════════════════════════════════════╝\n'
    );

    // Get current stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_pos_blocks,
        MIN(block_height) as first_block,
        MAX(block_height) as last_block,
        COUNT(DISTINCT staker_address) as unique_stakers,
        COUNT(CASE WHEN staker_address LIKE 'i%' THEN 1 END) as verusid_blocks
      FROM pos_blocks
    `);

    const data = stats.rows[0];
    const totalPosBlocks = parseInt(data.total_pos_blocks);
    const firstBlock = parseInt(data.first_block) || 0;
    const lastBlock = parseInt(data.last_block) || 0;
    const uniqueStakers = parseInt(data.unique_stakers);
    const verusidBlocks = parseInt(data.verusid_blocks);

    if (totalPosBlocks === 0) {
      console.log('⚠️  No data in pos_blocks table yet!');
      console.log('   The indexer might be starting up...\n');
      await pool.end();
      return;
    }

    // Calculate progress
    const targetStart = 987861; // Caribu66@ creation
    const targetEnd = 3660000; // Approximate current tip
    const totalToScan = targetEnd - targetStart;
    const scanned = lastBlock - targetStart;
    const progress = ((scanned / totalToScan) * 100).toFixed(2);

    console.log('📊 CURRENT STATUS:\n');
    console.log(`   PoS blocks indexed: ${totalPosBlocks.toLocaleString()}`);
    console.log(
      `   Range: ${firstBlock.toLocaleString()} → ${lastBlock.toLocaleString()}`
    );
    console.log(`   Unique stakers found: ${uniqueStakers.toLocaleString()}`);
    console.log(`   VerusID stake blocks: ${verusidBlocks.toLocaleString()}\n`);

    console.log('📈 PROGRESS:\n');
    console.log(`   Target start: ${targetStart.toLocaleString()}`);
    console.log(`   Target end: ${targetEnd.toLocaleString()}`);
    console.log(`   Current block: ${lastBlock.toLocaleString()}`);
    console.log(`   Progress: ${progress}%\n`);

    // Check if started from correct block
    if (firstBlock === targetStart) {
      console.log(
        `   ✅ Started from correct block (${targetStart.toLocaleString()})\n`
      );
    } else {
      console.log(
        `   ⚠️  Started from block ${firstBlock.toLocaleString()} (expected ${targetStart.toLocaleString()})\n`
      );
    }

    // ETA calculation
    const blocksRemaining = targetEnd - lastBlock;
    if (blocksRemaining > 0) {
      const estimatedRate = 180; // blocks per second (approximate)
      const etaSeconds = blocksRemaining / estimatedRate;
      const etaHours = (etaSeconds / 3600).toFixed(1);
      const etaMinutes = Math.round(etaSeconds / 60);

      console.log('⏱️  ESTIMATED TIME:\n');
      console.log(`   Blocks remaining: ${blocksRemaining.toLocaleString()}`);
      console.log(
        `   ETA: ${etaMinutes.toLocaleString()} minutes (~${etaHours} hours)\n`
      );

      const completionTime = new Date(Date.now() + etaSeconds * 1000);
      console.log(
        `   Estimated completion: ${completionTime.toLocaleString()}\n`
      );
    } else {
      console.log('\n🎉 INDEXING COMPLETE!\n');
    }

    // Progress bar
    const barLength = 50;
    const filled = Math.round((parseFloat(progress) / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`[${bar}] ${progress}%\n`);

    // Check for test VerusIDs
    console.log('🧪 TEST VERUSIDS:\n');

    const caribou = await pool.query(`
      SELECT COUNT(*) as count FROM pos_blocks
      WHERE staker_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
    `);

    const joanna = await pool.query(`
      SELECT COUNT(*) as count FROM pos_blocks
      WHERE staker_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
    `);

    console.log(
      `   Caribu66@: ${parseInt(caribou.rows[0].count).toLocaleString()} stake blocks found`
    );
    console.log(
      `   Joanna@: ${parseInt(joanna.rows[0].count).toLocaleString()} stake blocks found\n`
    );

    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkProgress().catch(console.error);
