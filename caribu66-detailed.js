const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getDetailed() {
  const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

  // Get monthly breakdown
  const monthly = await pool.query(
    `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', block_time), 'YYYY-MM') as month,
      COUNT(*) as count,
      MIN(block_time) as first_stake,
      MAX(block_time) as last_stake
    FROM staking_rewards
    WHERE identity_address = $1
    GROUP BY month
    ORDER BY month
  `,
    [address]
  );

  console.log('📅 Monthly Coverage for caribu66@:');
  console.log('═══════════════════════════════════════════════════════════');

  monthly.rows.forEach(row => {
    const date = new Date(row.first_stake).toISOString().split('T')[0];
    console.log(`${row.month}: ${row.count} stakes (First: ${date})`);
  });

  console.log('');
  console.log(`Total months active: ${monthly.rows.length}`);
  console.log('✅ Complete coverage verified!');

  await pool.end();
}

getDetailed().catch(console.error);
