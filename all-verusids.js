const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getAllVerusIDs() {
  // Get all identities with their stake counts
  const result = await pool.query(`
    SELECT 
      i.identity_address,
      i.friendly_name,
      i.base_name,
      COALESCE(stake_counts.stake_count, 0) as total_stakes
    FROM identities i
    LEFT JOIN (
      SELECT identity_address, COUNT(*) as stake_count
      FROM staking_rewards
      WHERE identity_address LIKE 'i%'
      GROUP BY identity_address
    ) stake_counts ON i.identity_address = stake_counts.identity_address
    WHERE i.identity_address LIKE 'i%'
    ORDER BY stake_counts.stake_count DESC NULLS LAST
  `);

  console.log(`Total VerusIDs in identities table: ${result.rows.length}`);
  console.log('');

  // Count how many have stakes
  const withStakes = result.rows.filter(r => r.total_stakes > 0).length;
  console.log(`VerusIDs with stakes: ${withStakes}`);
  console.log(`VerusIDs without stakes: ${result.rows.length - withStakes}`);
  console.log('');

  console.log('Top 20 VerusIDs by stake count:');
  console.log('');

  result.rows.slice(0, 20).forEach((row, i) => {
    const name = row.friendly_name || row.base_name || 'unknown';
    console.log(
      `${String(i + 1).padStart(2)}. ${row.identity_address}: ${parseInt(row.total_stakes).toLocaleString()} stakes (${name})`
    );
  });

  console.log('');
  console.log('...');
  console.log(`Total: ${result.rows.length} VerusIDs in database`);

  await pool.end();
}

getAllVerusIDs().catch(console.error);
