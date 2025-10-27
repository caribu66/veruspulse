const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkCoverage() {
  // Check how many 2022 stakes we had before scanning
  const existing2022 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1550000
  `);

  // Check total 2022 range
  const total2022 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1780000
  `);

  console.log('📊 2022 Coverage Check:');
  console.log(`   Existing in first 10k blocks: ${existing2022.rows[0].count}`);
  console.log(`   Total in 2022 range: ${total2022.rows[0].count}`);

  // Check most recent stakes
  const recent = await pool.query(`
    SELECT identity_address, block_height, block_time
    FROM staking_rewards 
    WHERE block_height >= 1600000
    ORDER BY block_height DESC
    LIMIT 5
  `);

  console.log('\n🔍 Most recent stakes added:');
  recent.rows.forEach(row => {
    console.log(`   ${row.identity_address} at block ${row.block_height}`);
  });

  await pool.end();
}

checkCoverage().catch(console.error);
