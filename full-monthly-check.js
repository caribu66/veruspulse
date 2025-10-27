const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function fullMonthlyCheck() {
  // Check our specific scanned range
  const months = await pool.query(`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', block_time), 'YYYY-MM') as month,
      COUNT(*) as stake_count
    FROM staking_rewards
    WHERE block_height BETWEEN 1299328 AND 2500000
    AND identity_address LIKE 'i%'
    GROUP BY month
    ORDER BY month
  `);

  console.log('Monthly Coverage (Dec 2020 - Dec 2025):');
  console.log('═══════════════════════════════════════════════════════');

  const monthList = [];
  months.rows.forEach(row => {
    monthList.push(row.month);
    console.log(
      `${row.month}: ${parseInt(row.stake_count).toLocaleString()} stakes`
    );
  });

  console.log('');
  console.log(`Total months covered: ${monthList.length}`);

  // Check for gaps
  const startDate = new Date('2020-12-01');
  const endDate = new Date('2025-12-31');
  let current = new Date(startDate);
  let missing = [];

  while (current <= endDate) {
    const monthStr = current.toISOString().split('T')[0].substring(0, 7);
    if (!monthList.includes(monthStr)) {
      missing.push(monthStr);
    }
    current.setMonth(current.getMonth() + 1);
  }

  if (missing.length > 0) {
    console.log(`Missing months: ${missing.join(', ')}`);
  } else {
    console.log('✅ All months covered in range!');
  }

  await pool.end();
}

fullMonthlyCheck().catch(console.error);
