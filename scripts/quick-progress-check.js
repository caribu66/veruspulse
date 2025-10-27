#!/usr/bin/env node

/**
 * Quick Progress Check for Joanna@ Scan
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

async function quickCheck() {
  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        MAX(block_height) as last_block,
        SUM(amount_sats) as total_sats
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    const current = result.rows[0];
    const currentHeight = 3780059; // Current blockchain height
    const scanStart = 800200;
    const totalBlocksToScan = currentHeight - scanStart;
    const blocksScanned = current.last_block - scanStart;
    const progressPercent = Math.min(
      100,
      (blocksScanned / totalBlocksToScan) * 100
    );

    console.log(`📊 Joanna@ Scan Progress: ${progressPercent.toFixed(1)}%`);
    console.log(
      `   Stakes: ${parseInt(current.total_stakes).toLocaleString()}`
    );
    console.log(`   Last Block: ${current.last_block.toLocaleString()}`);
    console.log(
      `   Total VRSC: ${(current.total_sats / 100000000).toFixed(2)}`
    );

    if (progressPercent < 100) {
      const remaining = totalBlocksToScan - blocksScanned;
      console.log(`   Remaining: ${remaining.toLocaleString()} blocks`);
    } else {
      console.log(`   ✅ Scan Complete!`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await pool.end();
  }
}

quickCheck();
