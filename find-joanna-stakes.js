#!/usr/bin/env node

/**
 * Find Joanna's Staking Rewards
 * Searches for any addresses or identities associated with "joanna"
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function findJoannaStakes() {
  console.log("🔍 SEARCHING FOR JOANNA'S STAKING REWARDS");
  console.log('==========================================\n');

  try {
    // Search for identities containing "joanna" (case insensitive)
    console.log('📊 Searching for identities containing "joanna"...');
    const identityResult = await pool.query(`
      SELECT 
        identity_address,
        base_name,
        friendly_name
      FROM identities 
      WHERE LOWER(base_name) LIKE '%joanna%' 
         OR LOWER(friendly_name) LIKE '%joanna%'
         OR LOWER(identity_address) LIKE '%joanna%'
      ORDER BY base_name
    `);

    if (identityResult.rows.length > 0) {
      console.log(
        `✅ Found ${identityResult.rows.length} identities matching "joanna":`
      );
      identityResult.rows.forEach((identity, index) => {
        console.log(`   ${index + 1}. ${identity.identity_address}`);
        console.log(`      Base name: ${identity.base_name}`);
        console.log(`      Friendly name: ${identity.friendly_name}`);
      });

      // Get staking rewards for these identities
      console.log('\n🎯 STAKING REWARDS FOR JOANNA:');
      console.log('===============================');

      for (const identity of identityResult.rows) {
        const stakesResult = await pool.query(
          `
          SELECT 
            COUNT(*) as total_stakes,
            SUM(amount_sats) as total_amount_sats,
            MIN(block_height) as first_stake_block,
            MAX(block_height) as last_stake_block,
            MIN(block_time) as first_stake_time,
            MAX(block_time) as last_stake_time
          FROM staking_rewards 
          WHERE identity_address = $1
        `,
          [identity.identity_address]
        );

        const stakes = stakesResult.rows[0];
        const totalVRSC = (stakes.total_amount_sats / 100000000).toFixed(2);

        console.log(
          `\n📊 ${identity.base_name} (${identity.identity_address}):`
        );
        console.log(`   Total stakes: ${stakes.total_stakes.toLocaleString()}`);
        console.log(`   Total amount: ${totalVRSC} VRSC`);
        console.log(
          `   First stake: Block ${stakes.first_stake_block} (${stakes.first_stake_time})`
        );
        console.log(
          `   Last stake: Block ${stakes.last_stake_block} (${stakes.last_stake_time})`
        );

        // Show recent stakes
        const recentStakesResult = await pool.query(
          `
          SELECT 
            block_height,
            block_time,
            amount_sats,
            txid
          FROM staking_rewards 
          WHERE identity_address = $1
          ORDER BY block_height DESC 
          LIMIT 5
        `,
          [identity.identity_address]
        );

        console.log(`   📋 Recent stakes:`);
        recentStakesResult.rows.forEach((stake, index) => {
          const amountVRSC = (stake.amount_sats / 100000000).toFixed(8);
          console.log(
            `      ${index + 1}. Block ${stake.block_height}: ${amountVRSC} VRSC`
          );
        });
      }
    } else {
      console.log('❌ No identities found containing "joanna"');

      // Try searching for addresses that might be related
      console.log('\n🔍 Searching for addresses that might be related...');

      // Search for any addresses containing "joanna" in the staking_rewards table
      const addressResult = await pool.query(`
        SELECT DISTINCT identity_address
        FROM staking_rewards 
        WHERE LOWER(identity_address) LIKE '%joanna%'
        LIMIT 10
      `);

      if (addressResult.rows.length > 0) {
        console.log(
          `✅ Found ${addressResult.rows.length} addresses containing "joanna":`
        );
        addressResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.identity_address}`);
        });

        // Get staking rewards for these addresses
        for (const row of addressResult.rows) {
          const stakesResult = await pool.query(
            `
            SELECT 
              COUNT(*) as total_stakes,
              SUM(amount_sats) as total_amount_sats,
              MIN(block_height) as first_stake_block,
              MAX(block_height) as last_stake_block
            FROM staking_rewards 
            WHERE identity_address = $1
          `,
            [row.identity_address]
          );

          const stakes = stakesResult.rows[0];
          const totalVRSC = (stakes.total_amount_sats / 100000000).toFixed(2);

          console.log(`\n📊 ${row.identity_address}:`);
          console.log(
            `   Total stakes: ${stakes.total_stakes.toLocaleString()}`
          );
          console.log(`   Total amount: ${totalVRSC} VRSC`);
          console.log(
            `   Block range: ${stakes.first_stake_block} to ${stakes.last_stake_block}`
          );
        }
      } else {
        console.log('❌ No addresses found containing "joanna"');

        // Show some example addresses to help with search
        console.log(
          '\n💡 TIP: Here are some example address formats to help you search:'
        );
        console.log('   - VerusID addresses start with "i" (e.g., iJoanna...)');
        console.log('   - Regular addresses start with "R" (e.g., RJoanna...)');
        console.log(
          '   - Try searching for partial matches or different spellings'
        );

        // Show some random addresses as examples
        const exampleResult = await pool.query(`
          SELECT DISTINCT identity_address
          FROM staking_rewards 
          ORDER BY RANDOM()
          LIMIT 5
        `);

        console.log('\n📋 Example addresses in the database:');
        exampleResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.identity_address}`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Error searching for Joanna's stakes:", error.message);
  } finally {
    await pool.end();
  }
}

findJoannaStakes();
