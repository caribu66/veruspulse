const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function findMissing() {
  // Get the actual date range from the database
  const range = await pool.query(`
    SELECT 
      MIN(block_time) as min_date,
      MAX(block_time) as max_date
    FROM staking_rewards
    WHERE block_height BETWEEN 1299328 AND 2500000
    AND identity_address LIKE 'i%'
  `);

  console.log(
    `Date range: ${new Date(range.rows[0].min_date).toISOString()} to ${new Date(range.rows[0].max_date).toISOString()}`
  );
  console.log('');

  // Get unique months
  const months = await pool.query(`
    SELECT DISTINCT
      DATE_TRUNC('month', block_time) as month,
      MIN(block_time) as first_stake,
      MAX(block_time) as last_stake
    FROM staking_rewards
    WHERE block_height BETWEEN 1299328 AND 2500000
    AND identity_address LIKE 'i%'
    GROUP BY DATE_TRUNC('month', block_time)
    ORDER BY month
  `);

  console.log('Available months:');
  months.rows.forEach((row, i) => {
    const month = new Date(row.month)
      .toISOString()
      .split('T')[0]
      .substring(0, 7);
    console.log(`  ${month}`);
  });

  console.log('');
  console.log(`Total unique months: ${months.rows.length}`);

  await pool.end();
}

findMissing().catch(console.error);
