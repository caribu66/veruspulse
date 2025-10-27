const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkWhyNotSaved() {
  // Check if block 2498070 is in the database at all
  const check = await pool.query(`
    SELECT 
      identity_address,
      block_height,
      block_time,
      txid
    FROM staking_rewards
    WHERE block_height = 2498070
  `);

  console.log(`Block 2,498,070 in database: ${check.rows.length} stakes found`);
  console.log('');

  if (check.rows.length > 0) {
    check.rows.forEach(row => {
      console.log(
        `   ${row.identity_address} - ${new Date(row.block_time).toISOString()}`
      );
    });
  }

  // Check if caribu66 has this block
  const caribu = await pool.query(`
    SELECT * FROM staking_rewards
    WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
    AND block_height = 2498070
  `);

  console.log('');
  console.log(`caribu66@ stake at block 2,498,070: ${caribu.rows.length}`);

  if (caribu.rows.length === 0) {
    console.log('');
    console.log(
      '⚠️  Issue found: Scanner found the stake but it was not saved!'
    );
    console.log('   This could be because:');
    console.log(
      '   1. The address was not recognized as a VerusID (I-address)'
    );
    console.log('   2. There was a foreign key constraint error');
    console.log('   3. The identity was not created in the identities table');
  }

  await pool.end();
}

checkWhyNotSaved().catch(console.error);
