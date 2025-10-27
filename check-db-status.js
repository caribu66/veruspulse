#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkStatus() {
  try {
    // Check table structure first
    const structureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staking_rewards' 
      ORDER BY ordinal_position
    `);

    console.log('📊 Table Structure:');
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });

    // Check max and min block heights
    const maxResult = await pool.query(
      'SELECT MAX(block_height) as last_height FROM staking_rewards'
    );
    const lastHeight = maxResult.rows[0].last_height || 0;

    const minResult = await pool.query(
      'SELECT MIN(block_height) as first_height FROM staking_rewards'
    );
    const firstHeight = minResult.rows[0].first_height || 0;

    // Check total stakes
    const countResult = await pool.query(
      'SELECT COUNT(*) as total_stakes FROM staking_rewards'
    );
    const totalStakes = countResult.rows[0].total_stakes;

    // Check I-address stakes
    const iAddressResult = await pool.query(
      "SELECT COUNT(*) as i_stakes FROM staking_rewards WHERE identity_address LIKE 'i%'"
    );
    const iStakes = iAddressResult.rows[0].i_stakes;

    console.log('\n📊 Database Status:');
    console.log(`   First scanned block: ${firstHeight}`);
    console.log(`   Last scanned block: ${lastHeight}`);
    console.log(`   Total stakes: ${totalStakes}`);
    console.log(`   I-address stakes: ${iStakes}`);
    console.log(`   R-address stakes: ${totalStakes - iStakes}`);

    // Check recent I-address stakes
    const recentResult = await pool.query(`
      SELECT block_height, identity_address, amount_sats, block_time 
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%' 
      ORDER BY block_height DESC 
      LIMIT 5
    `);

    console.log('\n🎯 Recent I-address stakes:');
    recentResult.rows.forEach(row => {
      const date = new Date(row.block_time).toISOString().split('T')[0];
      const amount = (row.amount_sats / 100000000).toFixed(8);
      console.log(
        `   Block ${row.block_height} (${date}): ${row.identity_address} - ${amount} VRSC`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();
