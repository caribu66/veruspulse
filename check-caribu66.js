const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkCaribu66() {
  // First, find the VerusID address for caribu66
  const identity = await pool.query(`
    SELECT identity_address 
    FROM identities
    WHERE friendly_name LIKE '%caribu66%' 
       OR base_name LIKE '%caribu66%'
    LIMIT 1
  `);

  let address;

  if (identity.rows.length === 0) {
    console.log('⚠️  VerusID "caribu66@" not found in identities table');
    console.log('Searching for stakes with caribu66...');

    // Try searching in staking_rewards
    const stakes = await pool.query(`
      SELECT DISTINCT identity_address 
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
      LIMIT 100
    `);

    console.log(`Found ${stakes.rows.length} sample addresses`);
    console.log(
      'Note: Without the full identity_address, I cannot check caribu66 specifically'
    );
    console.log('Please provide the I-address for caribu66@');

    await pool.end();
    return;
  }

  address = identity.rows[0].identity_address;
  console.log(`🎯 Checking: caribu66@ (${address})`);
  console.log('');

  // Get all stakes
  const totalStakes = await pool.query(
    `
    SELECT COUNT(*) as count FROM staking_rewards WHERE identity_address = $1
  `,
    [address]
  );

  console.log(
    `📊 Total stakes: ${parseInt(totalStakes.rows[0].count).toLocaleString()}`
  );
  console.log('');

  // Get stakes by year
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
        ELSE 'Other'
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

  console.log('📅 Coverage by year:');
  let scannedCount = 0;
  byYear.rows.forEach(row => {
    const count = parseInt(row.count);
    console.log(
      `   ${row.year}: ${count.toLocaleString()} stakes (blocks ${row.min_block} to ${row.max_block})`
    );
    if (['2021', '2022', '2023', '2024', '2025'].includes(row.year)) {
      scannedCount += count;
    }
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(
    `✅ Coverage in scanned years (2021-2025): ${scannedCount.toLocaleString()} stakes`
  );
  console.log(
    `📊 Total: ${parseInt(totalStakes.rows[0].count).toLocaleString()} stakes`
  );
  console.log('═══════════════════════════════════════════════════════════');

  await pool.end();
}

checkCaribu66().catch(console.error);
