#!/usr/bin/env node
/**
 * Check joanna@ scan status
 */

const { Pool } = require('pg');

async function checkJoannaScanStatus() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    // Find joanna@ - try different matching patterns
    console.log('Finding joanna@ in database...\n');
    const identityResult = await pool.query(`
      SELECT 
        identity_address,
        base_name,
        friendly_name,
        first_seen_block,
        last_scanned_block
      FROM identities 
      WHERE LOWER(base_name) LIKE LOWER('%joanna%')
         OR LOWER(friendly_name) LIKE LOWER('%joanna%')
    `);

    if (identityResult.rows.length === 0) {
      console.log('❌ joanna@ not found in database');
      console.log('\nChecking total identities in database...');
      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM identities'
      );
      console.log(`Total identities: ${totalResult.rows[0].total}`);
      console.log('\nShowing sample of identities:');
      const sampleResult = await pool.query(
        'SELECT base_name, friendly_name, identity_address FROM identities LIMIT 10'
      );
      sampleResult.rows.forEach(row => {
        console.log(
          `  - ${row.base_name} (${row.friendly_name}) ${row.identity_address}`
        );
      });
      await pool.end();
      process.exit(1);
    }

    console.log(`Found ${identityResult.rows.length} matching identities:\n`);
    identityResult.rows.forEach((row, idx) => {
      console.log(
        `${idx + 1}. ${row.base_name} (${row.friendly_name}) - ${row.identity_address}`
      );
    });
    console.log('');

    if (identityResult.rows.length > 1) {
      console.log('⚠️  Multiple matches found. Using first one.\n');
    }

    const identity = identityResult.rows[0];
    console.log('✅ Found joanna@:');
    console.log(`   I-address: ${identity.identity_address}`);
    console.log(`   Base name: ${identity.base_name}`);
    console.log(`   Friendly name: ${identity.friendly_name}`);
    console.log(`   First seen block: ${identity.first_seen_block}`);
    console.log(`   Last scanned block: ${identity.last_scanned_block}\n`);

    // Check staking_rewards table
    const stakesResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        MIN(block_height) as first_stake_block,
        MAX(block_height) as last_stake_block,
        MIN(block_time) as first_stake_time,
        MAX(block_time) as last_stake_time,
        SUM(amount_sats) as total_rewards_sats
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [identity.identity_address]
    );

    const stakes = stakesResult.rows[0];
    console.log('📊 Staking data in staking_rewards table:');
    console.log(`   Total stakes: ${stakes.total_stakes}`);
    console.log(`   First stake block: ${stakes.first_stake_block}`);
    console.log(`   Last stake block: ${stakes.last_stake_block}`);
    console.log(`   First stake time: ${stakes.first_stake_time}`);
    console.log(`   Last stake time: ${stakes.last_stake_time}`);
    console.log(
      `   Total rewards: ${parseFloat(stakes.total_rewards_sats || 0) / 100000000} VRSC\n`
    );

    // Check year distribution
    const yearResult = await pool.query(
      `
      SELECT 
        EXTRACT(YEAR FROM block_time) as year,
        COUNT(*) as stakes,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block
      FROM staking_rewards 
      WHERE identity_address = $1
      GROUP BY EXTRACT(YEAR FROM block_time)
      ORDER BY year
    `,
      [identity.identity_address]
    );

    console.log('📅 Stakes by year:');
    yearResult.rows.forEach(row => {
      console.log(
        `   ${row.year}: ${row.stakes} stakes (blocks ${row.min_block}-${row.max_block})`
      );
    });

    // Check what block VerusID was created
    console.log('\n🔍 Checking VerusID activation block...');
    const VERUSID_ACTIVATION = 800200;
    console.log(`   VerusID activation block: ${VERUSID_ACTIVATION}`);
    console.log(`   First stake block: ${stakes.first_stake_block}`);

    if (
      stakes.first_stake_block &&
      stakes.first_stake_block > VERUSID_ACTIVATION + 100000
    ) {
      console.log(
        '\n⚠️  WARNING: First stake is significantly after VerusID activation!'
      );
      console.log(
        '   This suggests we may be missing early stakes from 2020-2021.'
      );
      console.log(
        `   Missing block range: ${VERUSID_ACTIVATION} - ${stakes.first_stake_block - 1}`
      );
      console.log(
        `   That's ${stakes.first_stake_block - VERUSID_ACTIVATION} blocks!`
      );
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkJoannaScanStatus();
