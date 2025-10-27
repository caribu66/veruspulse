const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkActualRange() {
  // Get the actual block height range
  const range = await pool.query(`
    SELECT 
      MIN(block_height) as min_block,
      MAX(block_height) as max_block,
      MIN(block_time) as min_time,
      MAX(block_time) as max_time,
      COUNT(*) as total_stakes
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
  `);

  const min = range.rows[0].min_block;
  const max = range.rows[0].max_block;
  const minTime = new Date(range.rows[0].min_time);
  const maxTime = new Date(range.rows[0].max_time);

  console.log('Actual coverage in database:');
  console.log(
    `   Block range: ${min.toLocaleString()} to ${max.toLocaleString()}`
  );
  console.log(
    `   Time range: ${minTime.toISOString().split('T')[0]} to ${maxTime.toISOString().split('T')[0]}`
  );
  console.log(
    `   Total stakes: ${parseInt(range.rows[0].total_stakes).toLocaleString()}`
  );
  console.log('');

  // Check what we scanned
  const scanned = await pool.query(`
    SELECT 
      MIN(block_height) as min_block,
      MAX(block_height) as max_block,
      COUNT(*) as count
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    AND block_height BETWEEN 1299328 AND 2500000
  `);

  console.log('Stakes in our scanned range (1,299,328 to 2,500,000):');
  console.log(
    `   Block range: ${scanned.rows[0].min_block.toLocaleString()} to ${scanned.rows[0].max_block.toLocaleString()}`
  );
  console.log(`   Stakes: ${parseInt(scanned.rows[0].count).toLocaleString()}`);

  await pool.end();
}

checkActualRange().catch(console.error);
