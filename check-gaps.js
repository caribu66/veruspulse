const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkGaps() {
  // Check how many VerusID stakes we found in the 2020-2021 range
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM staking_rewards 
    WHERE block_height BETWEEN 1299328 AND 1540000
  `);

  console.log('📊 Stakes in December 2020 to December 2021 range:');
  console.log(
    `   ${parseInt(result.rows[0].count).toLocaleString()} stakes in database`
  );
  console.log('');

  // Count unique VerusIDs in this range
  const uniqueResult = await pool.query(`
    SELECT COUNT(DISTINCT identity_address) as unique_ids
    FROM staking_rewards 
    WHERE block_height BETWEEN 1299328 AND 1540000
  `);

  console.log('📋 Unique VerusIDs with stakes in this range:');
  console.log(
    `   ${parseInt(uniqueResult.rows[0].unique_ids).toLocaleString()} unique VerusIDs`
  );
  console.log('');

  // Check specific VerusIDs from the scan
  const testVerusIDs = [
    'iEi98FDNgkaRy7M4fjkJ613an7idtxf1Pg',
    'iEE8T4wdJg9BzVZbXw7pYcDcD4sqmTAZ8R',
    'iDb1zfeGzDayyiFATxgW17yu5mqd1GPybh',
  ];

  console.log('🔍 Checking specific VerusIDs from scan output:');
  for (const vid of testVerusIDs) {
    const vidResult = await pool.query(
      `
      SELECT COUNT(*) as count, MIN(block_height) as first, MAX(block_height) as last
      FROM staking_rewards 
      WHERE identity_address = $1 AND block_height BETWEEN 1299328 AND 1540000
    `,
      [vid]
    );

    const row = vidResult.rows[0];
    console.log(
      `   ${vid}: ${row.count} stakes (blocks ${row.first || 'none'} to ${row.last || 'none'})`
    );
  }

  await pool.end();
}

checkGaps().catch(console.error);
