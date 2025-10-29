#!/usr/bin/env node

/**
 * update-last-stake-time.js
 * Updates verusid_statistics.last_stake_time from staking_rewards table
 * This keeps the statistics table in sync with the latest stakes
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 3,
});

async function updateLastStakeTimes() {
  try {
    console.log('🔄 Updating last_stake_time for all VerusIDs...');

    const result = await pool.query(`
      INSERT INTO verusid_statistics (
        address, 
        last_stake_time,
        total_stakes,
        total_rewards_satoshis,
        first_stake_time,
        updated_at
      )
      SELECT 
        identity_address,
        MAX(block_time),
        COUNT(*),
        SUM(amount_sats),
        MIN(block_time),
        NOW()
      FROM staking_rewards 
      WHERE source_address = identity_address
      GROUP BY identity_address
      ON CONFLICT (address) 
      DO UPDATE SET
        last_stake_time = (
          SELECT MAX(block_time) 
          FROM staking_rewards 
          WHERE identity_address = verusid_statistics.address
            AND source_address = identity_address
        ),
        total_stakes = (
          SELECT COUNT(*) 
          FROM staking_rewards 
          WHERE identity_address = verusid_statistics.address
            AND source_address = identity_address
        ),
        total_rewards_satoshis = (
          SELECT SUM(amount_sats) 
          FROM staking_rewards 
          WHERE identity_address = verusid_statistics.address
            AND source_address = identity_address
        ),
        first_stake_time = (
          SELECT MIN(block_time) 
          FROM staking_rewards 
          WHERE identity_address = verusid_statistics.address
            AND source_address = identity_address
        ),
        updated_at = NOW()
    `);

    console.log('✅ Last stake times updated successfully!');
    return result;
  } catch (error) {
    console.error('❌ Error updating last stake times:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateLastStakeTimes()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { updateLastStakeTimes };
