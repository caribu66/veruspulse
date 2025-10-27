const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function getCaribu66Rank() {
  const result = await pool.query(`
    SELECT 
      identity_address,
      COUNT(*) as stake_count
    FROM staking_rewards
    WHERE identity_address LIKE 'i%'
    GROUP BY identity_address
    ORDER BY stake_count DESC
  `);

  const caribu66 = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
  const rank = result.rows.findIndex(r => r.identity_address === caribu66) + 1;
  const stakeCount = result.rows[rank - 1].stake_count;

  console.log('caribu66@ ranking:');
  console.log(`   Address: ${caribu66}`);
  console.log(`   Total stakes: ${parseInt(stakeCount).toLocaleString()}`);
  console.log(
    `   Rank: #${rank} out of ${result.rows.length} VerusIDs with stakes`
  );
  console.log('');
  console.log('Top 5 for comparison:');
  result.rows.slice(0, 5).forEach((row, i) => {
    console.log(
      `   ${i + 1}. ${parseInt(row.stake_count).toLocaleString()} stakes`
    );
  });

  await pool.end();
}

getCaribu66Rank().catch(console.error);
