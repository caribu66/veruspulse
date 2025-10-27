const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getRecentStakes() {
  const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

  // Get ALL stakes ordered by time
  const allStakes = await pool.query(
    `
    SELECT 
      block_height,
      block_time,
      amount_sats
    FROM staking_rewards
    WHERE identity_address = $1
    ORDER BY block_time DESC
  `,
    [address]
  );

  console.log(`Total stakes for caribu66@: ${allStakes.rows.length}`);
  console.log('');
  console.log('Most recent 20 stakes:');
  console.log('');

  allStakes.rows.slice(0, 20).forEach((row, i) => {
    const date = new Date(row.block_time).toISOString().split('T')[0];
    const amount = (row.amount_sats / 100000000).toFixed(8);
    console.log(
      `${i + 1}. Block ${row.block_height} (${date}): ${amount} VRSC`
    );
  });

  console.log('');
  console.log(
    `First stake: ${new Date(allStakes.rows[allStakes.rows.length - 1].block_time).toISOString()}`
  );
  console.log(
    `Last stake: ${new Date(allStakes.rows[0].block_time).toISOString()}`
  );

  await pool.end();
}

getRecentStakes().catch(console.error);
