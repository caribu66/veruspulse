#!/usr/bin/env node

/**
 * Update last_refreshed_at for VerusIDs that have recent staking activity
 * This fixes the issue where scanners don't update refresh dates for existing VerusIDs
 */

const { Pool } = require('pg');

const db = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 3,
});

async function updateRefreshDates() {
  console.log(
    '🔄 Updating last_refreshed_at for VerusIDs with recent staking activity...\n'
  );

  try {
    // Update VerusIDs that have staking activity in the last 30 days
    const query = `
      UPDATE identities 
      SET last_refreshed_at = NOW()
      WHERE identity_address IN (
        SELECT DISTINCT identity_address 
        FROM staking_rewards 
        WHERE block_time >= NOW() - INTERVAL '30 days'
      )
      AND (last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '7 days')
    `;

    const result = await db.query(query);

    console.log(
      `✅ Updated ${result.rowCount} VerusIDs with recent staking activity`
    );

    // Show some examples of updated VerusIDs
    const examplesQuery = `
      SELECT identity_address, base_name, friendly_name, last_refreshed_at
      FROM identities 
      WHERE identity_address IN (
        SELECT DISTINCT identity_address 
        FROM staking_rewards 
        WHERE block_time >= NOW() - INTERVAL '30 days'
      )
      ORDER BY last_refreshed_at DESC
      LIMIT 10
    `;

    const examples = await db.query(examplesQuery);

    console.log('\n📊 Recent VerusIDs with updated refresh dates:');
    examples.rows.forEach(row => {
      const name = row.friendly_name || row.base_name || row.identity_address;
      const refreshTime = new Date(row.last_refreshed_at)
        .toISOString()
        .split('T')[0];
      console.log(`   ${name}: ${refreshTime}`);
    });
  } catch (error) {
    console.error('❌ Error updating refresh dates:', error.message);
    throw error;
  } finally {
    await db.end();
  }
}

// Run the update
updateRefreshDates().catch(console.error);
