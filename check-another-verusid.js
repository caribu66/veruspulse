const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkAnother() {
  // Get another address with substantial stakes
  const result = await pool.query(`
    SELECT identity_address, COUNT(*) as stake_count
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    AND block_height BETWEEN 1299328 AND 2500000
    AND identity_address != 'iEi98FDNgkaRy7M4fjkJ613an7idtxf1Pg'
    GROUP BY identity_address
    ORDER BY stake_count DESC
    LIMIT 1
  `);

  const address = result.rows[0].identity_address;

  const byYear = await pool.query(
    `
    SELECT 
      CASE 
        WHEN block_height BETWEEN 1299328 AND 1540000 THEN '2021'
        WHEN block_height BETWEEN 1540000 AND 1780000 THEN '2022'
        WHEN block_height BETWEEN 1780000 AND 2020000 THEN '2023'
        WHEN block_height BETWEEN 2020000 AND 2260000 THEN '2024'
        WHEN block_height BETWEEN 2260000 AND 2500000 THEN '2025'
        ELSE 'Other'
      END as year,
      COUNT(*) as count
    FROM staking_rewards
    WHERE identity_address = $1
    GROUP BY year
    ORDER BY year
  `,
    [address]
  );

  console.log(`🎯 Checking: ${address}`);
  console.log('');
  console.log('📅 Stakes by year:');
  byYear.rows.forEach(row => {
    console.log(`   ${row.year || 'Other'}: ${row.count} stakes`);
  });

  await pool.end();
}

checkAnother().catch(console.error);
