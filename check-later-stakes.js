const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkLaterStakes() {
  // Check what stakes exist after April 2023
  const later = await pool.query(`
    SELECT 
      MIN(block_time) as earliest,
      MAX(block_time) as latest,
      COUNT(*) as count
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    AND block_time > '2023-04-30'
  `);

  console.log('Stakes AFTER April 2023:');
  console.log(`   Earliest: ${new Date(later.rows[0].earliest).toISOString()}`);
  console.log(`   Latest: ${new Date(later.rows[0].latest).toISOString()}`);
  console.log(
    `   Total stakes: ${parseInt(later.rows[0].count).toLocaleString()}`
  );
  console.log('');

  // Check block height range
  const blocks = await pool.query(`
    SELECT 
      MIN(block_height) as min_block,
      MAX(block_height) as max_block
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    AND block_time > '2023-04-30'
  `);

  console.log(
    `Block range: ${blocks.rows[0].min_block.toLocaleString()} to ${blocks.rows[0].max_block.toLocaleString()}`
  );

  await pool.end();
}

checkLaterStakes().catch(console.error);
