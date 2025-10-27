const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkCoverage() {
  // 2021 coverage (Dec 2020 - Dec 2021): blocks 1299328 to 1540000
  const year2021 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1299328 AND 1540000
    AND identity_address LIKE 'i%'
  `);

  // 2022 coverage (Dec 2021 - Dec 2022): blocks 1540000 to 1780000
  const year2022 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1780000
    AND identity_address LIKE 'i%'
  `);

  console.log('📊 Full Coverage Check for VerusID (I-address) Stakes:');
  console.log('');
  console.log('Year 2021 (Dec 2020 - Dec 2021):');
  console.log(`   Block range: 1,299,328 to 1,540,000`);
  console.log(
    `   VerusID stakes in database: ${year2021.rows[0].count.toLocaleString()}`
  );
  console.log(`   Expected: ~7,520 (from scanner)`);
  console.log(
    `   Status: ${year2021.rows[0].count >= 7500 ? '✅ FULL COVERAGE' : '⚠️  Missing stakes'}`
  );
  console.log('');

  console.log('Year 2022 (Dec 2021 - Dec 2022):');
  console.log(`   Block range: 1,540,000 to 1,780,000`);
  console.log(
    `   VerusID stakes in database: ${year2022.rows[0].count.toLocaleString()}`
  );
  console.log(`   Expected: ~9,428 (from scanner)`);
  console.log(
    `   Status: ${year2022.rows[0].count >= 9000 ? '✅ FULL COVERAGE' : '⚠️  Missing stakes'}`
  );
  console.log('');

  console.log('Overall Status:');
  const totalStakes =
    parseInt(year2021.rows[0].count) + parseInt(year2022.rows[0].count);
  console.log(`   Total VerusID stakes: ${totalStakes.toLocaleString()}`);

  if (year2021.rows[0].count >= 7500 && year2022.rows[0].count >= 9000) {
    console.log('   ✅ YES - You have FULL COVERAGE for 2021 and 2022!');
  } else {
    console.log('   ⚠️  Some gaps may remain');
  }

  await pool.end();
}

checkCoverage().catch(console.error);
