const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkVerusIDStakes() {
  // Check VerusID (I-address) stakes in 2022 range
  const verusid2022 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1780000
    AND identity_address LIKE 'i%'
  `);

  // Check R-address stakes
  const raddr2022 = await pool.query(`
    SELECT COUNT(*) as count FROM staking_rewards 
    WHERE block_height BETWEEN 1540000 AND 1780000
    AND identity_address LIKE 'R%'
  `);

  // Check a sample of recent 2022 stakes
  const recent = await pool.query(`
    SELECT identity_address, block_height
    FROM staking_rewards 
    WHERE block_height BETWEEN 1600000 AND 1605000
    AND identity_address LIKE 'i%'
    ORDER BY block_height DESC
    LIMIT 5
  `);

  console.log('📊 2022 Stakes by Type:');
  console.log(`   VerusID stakes (i-addresses): ${verusid2022.rows[0].count}`);
  console.log(`   R-addresses: ${raddr2022.rows[0].count}`);

  console.log('\n🔍 Sample VerusID stakes in scanned range:');
  if (recent.rows.length === 0) {
    console.log('   ⚠️  No VerusID stakes found in this range yet');
  } else {
    recent.rows.forEach(row => {
      console.log(`   ${row.identity_address} at block ${row.block_height}`);
    });
  }

  await pool.end();
}

checkVerusIDStakes().catch(console.error);
