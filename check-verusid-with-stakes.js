const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkVerusIDWithStakes() {
  // Get a VerusID that has the most stakes
  const top = await pool.query(`
    SELECT identity_address, COUNT(*) as stake_count
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    GROUP BY identity_address
    ORDER BY stake_count DESC
    LIMIT 1
  `);

  if (top.rows.length === 0) {
    console.log('No VerusID stakes found');
    await pool.end();
    return;
  }

  const address = top.rows[0].identity_address;
  const totalStakes = parseInt(top.rows[0].stake_count);

  console.log(`🎯 Checking coverage for: ${address}`);
  console.log(
    `📊 This address has ${totalStakes.toLocaleString()} total stakes`
  );
  console.log('');

  // Get stakes by year range
  const byYear = await pool.query(
    `
    SELECT 
      CASE 
        WHEN block_height BETWEEN 1299328 AND 1540000 THEN '2021'
        WHEN block_height BETWEEN 1540000 AND 1780000 THEN '2022'
        WHEN block_height BETWEEN 1780000 AND 2020000 THEN '2023'
        WHEN block_height BETWEEN 2020000 AND 2260000 THEN '2024'
        WHEN block_height BETWEEN 2260000 AND 2500000 THEN '2025'
        WHEN block_height < 1299328 THEN 'Before 2021'
        WHEN block_height > 2500000 THEN 'After 2025'
        ELSE 'Unknown'
      END as year,
      COUNT(*) as count,
      MIN(block_height) as min_block,
      MAX(block_height) as max_block
    FROM staking_rewards
    WHERE identity_address = $1
    GROUP BY year
    ORDER BY min_block
  `,
    [address]
  );

  console.log('📅 Coverage by year range:');
  let coverageCount = 0;
  byYear.rows.forEach(row => {
    const percent = ((row.count / totalStakes) * 100).toFixed(1);
    console.log(
      `   ${row.year}: ${row.count} stakes (${percent}%) - Blocks ${row.min_block} to ${row.max_block}`
    );
    if (['2021', '2022', '2023', '2024', '2025'].includes(row.year)) {
      coverageCount += parseInt(row.count);
    }
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(
    `Coverage in scanned years (2021-2025): ${coverageCount.toLocaleString()} stakes (${((coverageCount / totalStakes) * 100).toFixed(1)}%)`
  );
  console.log(`Total stakes: ${totalStakes.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════');

  await pool.end();
}

checkVerusIDWithStakes().catch(console.error);
