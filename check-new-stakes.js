const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkNewStakes() {
  // Check if we're finding NEW stakes or just duplicates
  const recentStakes = await pool.query(`
    SELECT identity_address, COUNT(*) as count, MIN(block_height) as min_block
    FROM staking_rewards 
    WHERE block_height BETWEEN 1325000 AND 1326000
    GROUP BY identity_address
    ORDER BY count DESC
    LIMIT 10
  `);

  console.log('🔍 Recent stakes found (blocks 1,325,000 to 1,326,000):');
  recentStakes.rows.forEach(row => {
    console.log(
      `   ${row.identity_address}: ${row.count} stakes (starting at ${row.min_block})`
    );
  });

  await pool.end();
}

checkNewStakes().catch(console.error);
