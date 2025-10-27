const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkRandomVerusID() {
  // Get a random I-address from identities table
  const random = await pool.query(`
    SELECT identity_address 
    FROM identities 
    WHERE identity_address LIKE 'i%'
    ORDER BY RANDOM()
    LIMIT 1
  `);

  if (random.rows.length === 0) {
    console.log('No VerusID addresses found in database');
    await pool.end();
    return;
  }

  const address = random.rows[0].identity_address;
  console.log(`🎯 Checking coverage for: ${address}`);
  console.log('');

  // Get all stakes for this address
  const stakes = await pool.query(
    `
    SELECT 
      block_height,
      block_time,
      amount_sats,
      CASE 
        WHEN block_height BETWEEN 1299328 AND 1540000 THEN '2021'
        WHEN block_height BETWEEN 1540000 AND 1780000 THEN '2022'
        WHEN block_height BETWEEN 1780000 AND 2020000 THEN '2023'
        WHEN block_height BETWEEN 2020000 AND 2260000 THEN '2024'
        WHEN block_height BETWEEN 2260000 AND 2500000 THEN '2025'
        ELSE 'Other'
      END as year
    FROM staking_rewards
    WHERE identity_address = $1
    ORDER BY block_height
  `,
    [address]
  );

  console.log(`📊 Total stakes found: ${stakes.rows.length}`);
  console.log('');

  if (stakes.rows.length > 0) {
    console.log('📅 Stakes by year:');
    const byYear = {};
    stakes.rows.forEach(row => {
      const year = row.year || 'Other';
      byYear[year] = (byYear[year] || 0) + 1;
    });

    Object.keys(byYear)
      .sort()
      .forEach(year => {
        console.log(`   ${year}: ${byYear[year]} stakes`);
      });

    console.log('');
    console.log('📋 First 5 stakes:');
    stakes.rows.slice(0, 5).forEach((row, i) => {
      const date = new Date(row.block_time).toISOString().split('T')[0];
      const amount = (row.amount_sats / 100000000).toFixed(8);
      console.log(
        `   ${i + 1}. Block ${row.block_height} (${date}): ${amount} VRSC`
      );
    });

    if (stakes.rows.length > 5) {
      console.log('   ...');
      console.log(`   Total: ${stakes.rows.length} stakes`);
    }
  }

  await pool.end();
}

checkRandomVerusID().catch(console.error);
