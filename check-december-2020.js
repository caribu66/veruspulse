#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkDecember2020() {
  try {
    // December 2020 block range: 1299328 to 1300000 (approximately)
    const december2020Start = 1299328;
    const december2020End = 1300000;

    console.log('📊 Checking December 2020 VerusID stakes...');
    console.log(`📅 Block range: ${december2020Start} to ${december2020End}`);
    console.log('');

    // Check if there are any stakes in December 2020
    const decemberResult = await pool.query(
      `
      SELECT COUNT(*) as count, 
             MIN(block_height) as min_block, 
             MAX(block_height) as max_block
      FROM staking_rewards 
      WHERE block_height BETWEEN $1 AND $2
    `,
      [december2020Start, december2020End]
    );

    const decemberCount = decemberResult.rows[0].count;
    const minBlock = decemberResult.rows[0].min_block;
    const maxBlock = decemberResult.rows[0].max_block;

    console.log(`🎯 December 2020 stakes: ${decemberCount}`);
    if (decemberCount > 0) {
      console.log(`   Min block: ${minBlock}`);
      console.log(`   Max block: ${maxBlock}`);
    }

    // Check what the actual first block in database is
    const firstResult = await pool.query(`
      SELECT MIN(block_height) as first_block,
             MAX(block_height) as last_block,
             COUNT(*) as total_stakes
      FROM staking_rewards
    `);

    const firstBlock = firstResult.rows[0].first_block;
    const lastBlock = firstResult.rows[0].last_block;
    const totalStakes = firstResult.rows[0].total_stakes;

    console.log('');
    console.log('📊 Database coverage:');
    console.log(`   First block: ${firstBlock}`);
    console.log(`   Last block: ${lastBlock}`);
    console.log(`   Total stakes: ${totalStakes}`);

    // Check if December 2020 is covered
    if (firstBlock <= december2020Start && lastBlock >= december2020End) {
      console.log('✅ December 2020 is fully covered in database');
    } else if (firstBlock > december2020Start) {
      console.log(
        '❌ December 2020 is NOT covered - starts after December 2020'
      );
      console.log(`   Gap: Block ${december2020Start} to ${firstBlock - 1}`);
    } else if (lastBlock < december2020End) {
      console.log(
        '❌ December 2020 is partially covered - ends before December 2020'
      );
    }

    // Show some December 2020 stakes if they exist
    if (decemberCount > 0) {
      const sampleResult = await pool.query(
        `
        SELECT block_height, identity_address, amount_sats, block_time
        FROM staking_rewards 
        WHERE block_height BETWEEN $1 AND $2
        ORDER BY block_height
        LIMIT 10
      `,
        [december2020Start, december2020End]
      );

      console.log('');
      console.log('🎯 Sample December 2020 stakes:');
      sampleResult.rows.forEach(row => {
        const date = new Date(row.block_time).toISOString().split('T')[0];
        const amount = (row.amount_sats / 100000000).toFixed(8);
        console.log(
          `   Block ${row.block_height} (${date}): ${row.identity_address} - ${amount} VRSC`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDecember2020();
