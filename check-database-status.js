#!/usr/bin/env node

const { Pool } = require('pg');

// Use the working database connection string
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...\n');

    // Check total stakes
    const stakesResult = await pool.query(
      'SELECT COUNT(*) as total_stakes FROM staking_rewards'
    );
    const totalStakes = stakesResult.rows[0].total_stakes;

    // Check latest block
    const latestResult = await pool.query(
      'SELECT MAX(block_height) as latest_block FROM staking_rewards'
    );
    const latestBlock = latestResult.rows[0].latest_block;

    // Check date range
    const dateResult = await pool.query(`
      SELECT 
        MIN(block_time) as earliest_stake,
        MAX(block_time) as latest_stake
      FROM staking_rewards
    `);
    const { earliest_stake, latest_stake } = dateResult.rows[0];

    console.log('📊 Database Status:');
    console.log(`   Total stake events: ${totalStakes.toLocaleString()}`);
    console.log(`   Latest block: ${latestBlock.toLocaleString()}`);
    console.log(`   Date range: ${earliest_stake} to ${latest_stake}`);

    // Get current blockchain height for comparison
    const { execSync } = require('child_process');
    const currentHeight = parseInt(
      execSync('/home/explorer/verus-cli/verus getblockcount', {
        encoding: 'utf8',
      }).trim()
    );
    const blocksMissing = currentHeight - latestBlock;
    const percentage = ((latestBlock / currentHeight) * 100).toFixed(1);

    console.log(
      `   Current blockchain height: ${currentHeight.toLocaleString()}`
    );
    console.log(`   Blocks missing: ${blocksMissing.toLocaleString()}`);
    console.log(`   Coverage: ${percentage}%`);

    if (blocksMissing > 1000000) {
      console.log('\n🎯 Status: Staking data extension needed');
      console.log('💡 Run the priority scans to extend data to current tip');
    } else {
      console.log('\n✅ Status: Staking data is up-to-date!');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseStatus();
