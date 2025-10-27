const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkMonthlyCoverage() {
  console.log('📊 Checking Monthly Coverage (2021-2025)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Get monthly counts
  const months = await pool.query(`
    SELECT 
      DATE_TRUNC('month', block_time) as month,
      COUNT(*) as stake_count,
      COUNT(DISTINCT identity_address) as unique_addresses
    FROM staking_rewards
    WHERE block_height BETWEEN 1299328 AND 2500000
    AND identity_address LIKE 'i%'
    GROUP BY month
    ORDER BY month
  `);

  console.log('Month            | Stakes  | VerusIDs');
  console.log('─────────────────┼─────────┼──────────');

  months.rows.forEach(row => {
    const date = new Date(row.month);
    const monthStr = date.toISOString().split('T')[0].substring(0, 7);
    const stakes = parseInt(row.stake_count).toLocaleString().padStart(7);
    const addresses = parseInt(row.unique_addresses)
      .toLocaleString()
      .padStart(9);
    console.log(`${monthStr}      | ${stakes} | ${addresses}`);
  });

  console.log('');
  const totalMonths = months.rows.length;
  const expectedMonths = 60; // 5 years * 12 months

  console.log(`Total months with data: ${totalMonths}`);
  console.log(`Expected months: ${expectedMonths}`);

  if (totalMonths >= 60) {
    console.log('✅ All months covered!');
  } else {
    console.log(`⚠️  Missing ${expectedMonths - totalMonths} months`);
  }

  await pool.end();
}

checkMonthlyCoverage().catch(console.error);
