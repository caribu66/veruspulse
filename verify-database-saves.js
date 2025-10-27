#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function verifySaves() {
  try {
    console.log('🔍 Verifying database saves...');
    console.log('');

    // Check December 2020 stakes
    const decemberResult = await pool.query(`
      SELECT COUNT(*) as count, 
             MIN(block_height) as min_block, 
             MAX(block_height) as max_block
      FROM staking_rewards 
      WHERE block_height BETWEEN 1299328 AND 1300000
    `);

    console.log('📊 December 2020 stakes in database:');
    console.log(`   Count: ${decemberResult.rows[0].count}`);
    console.log(`   Min block: ${decemberResult.rows[0].min_block}`);
    console.log(`   Max block: ${decemberResult.rows[0].max_block}`);

    // Check recent stakes from scanner
    const recentResult = await pool.query(`
      SELECT COUNT(*) as count,
             MIN(block_height) as min_block,
             MAX(block_height) as max_block
      FROM staking_rewards 
      WHERE block_height BETWEEN 1299328 AND 1305000
    `);

    console.log('');
    console.log('📊 Recent scanner range (1299328-1305000):');
    console.log(`   Count: ${recentResult.rows[0].count}`);
    console.log(`   Min block: ${recentResult.rows[0].min_block}`);
    console.log(`   Max block: ${recentResult.rows[0].max_block}`);

    // Show some specific stakes that should be there
    const sampleResult = await pool.query(`
      SELECT block_height, identity_address, amount_sats, block_time
      FROM staking_rewards 
      WHERE block_height BETWEEN 1299328 AND 1305000
      ORDER BY block_height DESC
      LIMIT 10
    `);

    console.log('');
    console.log('🎯 Recent stakes found in database:');
    sampleResult.rows.forEach(row => {
      const date = new Date(row.block_time).toISOString().split('T')[0];
      const amount = (row.amount_sats / 100000000).toFixed(8);
      console.log(
        `   Block ${row.block_height} (${date}): ${row.identity_address} - ${amount} VRSC`
      );
    });

    // Check if the scanner is actually saving to the right table
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%stake%'
    `);

    console.log('');
    console.log('📊 Stake-related tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   ${row.table_name}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifySaves();
