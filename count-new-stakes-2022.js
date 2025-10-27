const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function countNewStakes() {
  // Check how many stakes existed before the 2022 scan
  // The scanner reported finding 9,059 stakes
  // We need to see how many were NEW vs already existing

  const beforeScan = await pool.query(`
    SELECT COUNT(*) as count 
    FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1780000
    AND identity_address LIKE 'i%'
  `);

  console.log('📊 2022 Coverage Analysis:');
  console.log(
    `   Total VerusID stakes in 2022 range now: ${beforeScan.rows[0].count}`
  );
  console.log(`   Scanner found: 9,059 stakes`);
  console.log('');

  // The scanner uses ON CONFLICT DO NOTHING, so duplicates are ignored
  // So the total in DB should be AT LEAST 9,059
  // If it's more than 9,059, that means some existed before
  // If it's exactly 9,059, all were new

  const existingBefore = beforeScan.rows[0].count - 9059;

  console.log('🔍 New Stakes Analysis:');
  if (existingBefore <= 0) {
    console.log(
      `   ✅ ALL stakes are NEW! (${beforeScan.rows[0].count} new stakes added)`
    );
  } else {
    console.log(`   📝 ${existingBefore} stakes already existed in database`);
    console.log(`   ✨ ${9059 - existingBefore} new stakes were added`);
  }

  await pool.end();
}

countNewStakes().catch(console.error);
