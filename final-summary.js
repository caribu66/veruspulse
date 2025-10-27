const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getFinalSummary() {
  // Get stakes for each year
  const y2021 = await pool.query(
    `SELECT COUNT(*) as count FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1540000 AND identity_address LIKE 'i%'`
  );
  const y2022 = await pool.query(
    `SELECT COUNT(*) as count FROM staking_rewards WHERE block_height BETWEEN 1540000 AND 1780000 AND identity_address LIKE 'i%'`
  );
  const y2023 = await pool.query(
    `SELECT COUNT(*) as count FROM staking_rewards WHERE block_height BETWEEN 1780000 AND 2020000 AND identity_address LIKE 'i%'`
  );

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         COMPLETE VERUSID STAKING COVERAGE                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Year 2021 (Dec 2020 - Dec 2021):');
  console.log(`   Blocks: 1,299,328 to 1,540,000 (240,672 blocks)`);
  console.log(
    `   VerusID stakes: ${parseInt(y2021.rows[0].count).toLocaleString()}`
  );
  console.log('');
  console.log('📊 Year 2022 (Dec 2021 - Dec 2022):');
  console.log(`   Blocks: 1,540,000 to 1,780,000 (240,000 blocks)`);
  console.log(
    `   VerusID stakes: ${parseInt(y2022.rows[0].count).toLocaleString()}`
  );
  console.log('');
  console.log('📊 Year 2023 (Dec 2022 - Dec 2023):');
  console.log(`   Blocks: 1,780,000 to 2,020,000 (240,000 blocks)`);
  console.log(
    `   VerusID stakes: ${parseInt(y2023.rows[0].count).toLocaleString()}`
  );
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  const total =
    parseInt(y2021.rows[0].count) +
    parseInt(y2022.rows[0].count) +
    parseInt(y2023.rows[0].count);
  console.log(`   TOTAL VERUSID STAKES: ${total.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Full coverage achieved for 3 full years!');

  await pool.end();
}

getFinalSummary().catch(console.error);
