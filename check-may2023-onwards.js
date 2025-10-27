const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkMay2023Onwards() {
  // Check if there are ANY stakes in the database after April 2023
  const laterStakes = await pool.query(`
    SELECT 
      COUNT(*) as count,
      MIN(block_time) as earliest,
      MAX(block_time) as latest
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    AND block_time BETWEEN '2023-05-01' AND '2025-12-31'
  `);

  console.log('VerusID stakes May 2023 - Dec 2025:');
  console.log(
    `   Total: ${parseInt(laterStakes.rows[0].count).toLocaleString()}`
  );
  console.log(
    `   Date range: ${new Date(laterStakes.rows[0].earliest).toISOString()} to ${new Date(laterStakes.rows[0].latest).toISOString()}`
  );
  console.log('');

  // Now check caribu66 specifically after April 2023
  const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
  const laterCaribu = await pool.query(
    `
    SELECT 
      COUNT(*) as count,
      MIN(block_time) as earliest,
      MAX(block_time) as latest
    FROM staking_rewards
    WHERE identity_address = $1
    AND block_time BETWEEN '2023-05-01' AND '2025-12-31'
  `,
    [address]
  );

  console.log('caribu66@ stakes May 2023 - Dec 2025:');
  console.log(`   Total: ${parseInt(laterCaribu.rows[0].count)}`);

  if (parseInt(laterCaribu.rows[0].count) === 0) {
    console.log('   Status: ❌ NO COVERAGE - Missing stakes!');
  } else {
    console.log(
      `   Date range: ${new Date(laterCaribu.rows[0].earliest).toISOString()} to ${new Date(laterCaribu.rows[0].latest).toISOString()}`
    );
  }

  await pool.end();
}

checkMay2023Onwards().catch(console.error);
