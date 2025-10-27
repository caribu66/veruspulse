#!/usr/bin/env node

/**
 * Update VerusID Creation Dates Using First Staking Event
 *
 * This script uses the most reliable method: finding the first staking event
 * for each VerusID and using that as the creation date approximation.
 *
 * Why this works:
 * - VerusIDs typically start staking immediately or very soon after creation
 * - First stake data is reliable and stored in our database
 * - getidentityhistory returns incorrect data (future dates)
 * - getidentity returns last update block, not creation block
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function updateCreationDatesFromStakes() {
  console.log(
    '🔍 Updating VerusID creation dates from first staking events...\n'
  );

  try {
    // Get all VerusIDs with their first staking event
    const query = `
      SELECT 
        sr.identity_address,
        i.base_name,
        i.friendly_name,
        MIN(sr.block_height) as first_stake_block,
        MIN(sr.block_time) as first_stake_time
      FROM staking_rewards sr
      JOIN identities i ON sr.identity_address = i.identity_address
      WHERE sr.block_height > 0
        AND sr.block_time > '2019-01-01'
      GROUP BY sr.identity_address, i.base_name, i.friendly_name
      ORDER BY first_stake_time ASC
    `;

    const result = await pool.query(query);

    console.log(`📊 Found ${result.rows.length} VerusIDs with staking data\n`);

    let updated = 0;
    let skipped = 0;

    for (const row of result.rows) {
      const {
        identity_address,
        base_name,
        friendly_name,
        first_stake_block,
        first_stake_time,
      } = row;

      // Update the identities table with creation data from first stake
      const updateResult = await pool.query(
        `
        UPDATE identities
        SET 
          creation_block_height = $1,
          creation_timestamp = $2
        WHERE identity_address = $3
          AND (creation_block_height IS NULL OR creation_timestamp > '2025-01-01')
      `,
        [first_stake_block, first_stake_time, identity_address]
      );

      if (updateResult.rowCount > 0) {
        updated++;
        const name = friendly_name || base_name || identity_address;
        console.log(
          `✅ ${name}: Block ${first_stake_block} (${new Date(first_stake_time).toISOString().split('T')[0]})`
        );
      } else {
        skipped++;
      }
    }

    console.log(`\n✨ Update complete!`);
    console.log(`   Updated: ${updated} VerusIDs`);
    console.log(
      `   Skipped: ${skipped} VerusIDs (already had valid creation dates)`
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update
updateCreationDatesFromStakes().catch(console.error);
