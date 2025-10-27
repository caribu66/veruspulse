const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkMissing() {
  const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

  // Get the full date range
  const range = await pool.query(
    `
    SELECT 
      MIN(block_time) as first_stake,
      MAX(block_time) as last_stake,
      MIN(block_height) as first_block,
      MAX(block_height) as last_block
    FROM staking_rewards
    WHERE identity_address = $1
  `,
    [address]
  );

  const first = new Date(range.rows[0].first_stake);
  const last = new Date(range.rows[0].last_stake);

  console.log(`First stake: ${first.toISOString()}`);
  console.log(`Last stake: ${last.toISOString()}`);
  console.log(
    `Block range: ${range.rows[0].first_block} to ${range.rows[0].last_block}`
  );
  console.log('');

  // Check if there are gaps after April 2023
  const afterApril = await pool.query(
    `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', block_time), 'YYYY-MM') as month,
      COUNT(*) as count
    FROM staking_rewards
    WHERE identity_address = $1
    AND block_time > '2023-04-30'
    GROUP BY month
    ORDER BY month
  `,
    [address]
  );

  if (afterApril.rows.length > 0) {
    console.log('Stakes AFTER April 2023:');
    afterApril.rows.forEach(row => {
      console.log(`   ${row.month}: ${row.count} stakes`);
    });
  } else {
    console.log('⚠️  NO stakes found after April 2023');
    console.log('');
    console.log('This means coverage is INCOMPLETE after April 2023');
  }

  await pool.end();
}

checkMissing().catch(console.error);
