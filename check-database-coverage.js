const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkCoverage() {
  const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

  // Check how many stakes we have vs what the export says
  const result = await pool.query(
    `
    SELECT 
      COUNT(*) as count,
      MIN(block_height) as min_block,
      MAX(block_height) as max_block,
      MIN(block_time) as first_stake,
      MAX(block_time) as last_stake
    FROM staking_rewards
    WHERE identity_address = $1
  `,
    [address]
  );

  console.log('Database coverage for caribu66@:');
  console.log(`   Total stakes: ${result.rows[0].count}`);
  console.log(
    `   Block range: ${result.rows[0].min_block} to ${result.rows[0].max_block}`
  );
  console.log(
    `   Date range: ${result.rows[0].first_stake} to ${result.rows[0].last_stake}`
  );
  console.log('');
  console.log('Export shows: 921 stakes through October 2025');
  console.log(
    `Database has: ${result.rows[0].count} stakes through April 2023`
  );
  console.log('');
  console.log('Missing:', 921 - result.rows[0].count, 'stakes');
  console.log(
    'These are the stakes from April 2023 onwards that were not saved.'
  );

  await pool.end();
}

checkCoverage().catch(console.error);
