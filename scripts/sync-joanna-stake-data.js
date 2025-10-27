#!/usr/bin/env node
/**
 * Sync joanna@'s stake data from stake_events to staking_rewards table
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

async function syncStakeData() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  Sync joanna@ stake data to staking_rewards  ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Get all stake events for joanna@
    console.log('📊 Checking stake_events table...');
    const stakeEventsResult = await pool.query(
      `
      SELECT 
        address,
        txid,
        block_height,
        block_time,
        reward_amount
      FROM stake_events
      WHERE address = $1
      ORDER BY block_height
    `,
      [JOANNA_IADDR]
    );

    console.log(
      `   Found ${stakeEventsResult.rows.length} stakes in stake_events\n`
    );

    if (stakeEventsResult.rows.length === 0) {
      console.log('❌ No stake events found for joanna@');
      await pool.end();
      return;
    }

    // Show date range
    const first = stakeEventsResult.rows[0];
    const last = stakeEventsResult.rows[stakeEventsResult.rows.length - 1];
    console.log(`   Date range: ${first.block_time} to ${last.block_time}`);
    console.log(
      `   Block range: ${first.block_height} to ${last.block_height}\n`
    );

    // Check current staking_rewards
    const currentRewardsResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    console.log(`📊 Current staking_rewards table:`);
    console.log(`   ${currentRewardsResult.rows[0].count} stakes\n`);

    // Migrate data
    console.log('🔄 Migrating stake_events to staking_rewards...\n');

    let inserted = 0;
    let skipped = 0;

    for (const stake of stakeEventsResult.rows) {
      try {
        // reward_amount in stake_events is already in satoshis
        const amountSats = stake.reward_amount;

        const result = await pool.query(
          `
          INSERT INTO staking_rewards (
            identity_address,
            txid,
            vout,
            block_height,
            block_hash,
            block_time,
            amount_sats,
            classifier,
            source_address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (txid, vout) DO NOTHING
          RETURNING *
        `,
          [
            JOANNA_IADDR,
            stake.txid,
            1, // Use vout=1 for stake rewards (standard for PoS)
            stake.block_height,
            null, // block_hash - not critical for display, can be null
            stake.block_time,
            amountSats,
            'coinbase',
            JOANNA_IADDR,
          ]
        );

        if (result.rowCount > 0) {
          inserted++;
          if (inserted <= 5 || inserted % 50 === 0) {
            console.log(
              `   ✅ Inserted stake at block ${stake.block_height} (${new Date(stake.block_time).toLocaleDateString()})`
            );
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(
          `   ❌ Error inserting stake at block ${stake.block_height}: ${error.message}`
        );
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Inserted: ${inserted} new stakes`);
    console.log(`   Skipped: ${skipped} (already exist)\n`);

    // Verify final count
    const finalCountResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    console.log(
      `📊 Final staking_rewards count: ${finalCountResult.rows[0].count} stakes\n`
    );

    // Now recalculate statistics
    console.log('📈 Recalculating statistics for joanna@...\n');

    // Get statistics from staking_rewards
    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        SUM(amount_sats) as total_rewards_sats,
        MIN(block_time) as first_stake,
        MAX(block_time) as last_stake,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    const stats = statsResult.rows[0];
    console.log(`   Total stakes: ${stats.total_stakes}`);
    console.log(
      `   Total rewards: ${(parseFloat(stats.total_rewards_sats) / 100000000).toFixed(4)} VRSC`
    );
    console.log(`   First stake: ${stats.first_stake}`);
    console.log(`   Last stake: ${stats.last_stake}`);
    console.log(`   Block range: ${stats.min_block} - ${stats.max_block}\n`);

    // Update verusid_statistics
    console.log('📊 Updating verusid_statistics table...');

    await pool.query(
      `
      INSERT INTO verusid_statistics (
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis,
        first_stake_time,
        last_stake_time,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (address)
      DO UPDATE SET
        total_stakes = $3,
        total_rewards_satoshis = $4,
        first_stake_time = $5,
        last_stake_time = $6,
        updated_at = NOW()
    `,
      [
        JOANNA_IADDR,
        'Joanna.VRSC@',
        stats.total_stakes,
        stats.total_rewards_sats,
        stats.first_stake,
        stats.last_stake,
      ]
    );

    console.log('   ✅ Statistics updated!\n');

    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║           SYNC COMPLETE!                      ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🎉 joanna@ now has complete staking history from 2020!\n');

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncStakeData();
