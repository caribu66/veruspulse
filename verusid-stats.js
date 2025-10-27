const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getStats() {
  // Get total VerusID count with stakes
  const verusidCount = await pool.query(`
    SELECT COUNT(DISTINCT identity_address) as count
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
  `);

  // Get total stakes
  const totalStakes = await pool.query(`
    SELECT COUNT(*) as count
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
  `);

  // Get top stakers
  const topStakers = await pool.query(`
    SELECT identity_address, COUNT(*) as stake_count
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
    GROUP BY identity_address
    ORDER BY stake_count DESC
    LIMIT 10
  `);

  console.log('📊 VerusID Staking Statistics');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(
    `Total unique VerusIDs with stakes: ${verusidCount.rows[0].count}`
  );
  console.log(
    `Total VerusID stakes: ${totalStakes.rows[0].count.toLocaleString()}`
  );
  console.log('');
  console.log('Top 10 VerusIDs by stake count:');
  topStakers.rows.forEach((row, i) => {
    console.log(
      `   ${i + 1}. ${row.identity_address}: ${parseInt(row.stake_count).toLocaleString()} stakes`
    );
  });

  await pool.end();
}

getStats().catch(console.error);
