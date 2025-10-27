const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkTxid() {
  const csv = fs.readFileSync(
    '/home/explorer/Documents/tx_export_1761068678152.csv',
    'utf8'
  );
  const lines = csv.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts[0] === 'stake' && parts[3].startsWith('2025-10')) {
      const txid = parts[7];
      const date = parts[3];

      console.log(`Checking TXID from export: ${txid}`);
      console.log(`Date: ${date}`);

      const result = await pool.query(
        'SELECT * FROM staking_rewards WHERE txid = $1',
        [txid]
      );

      console.log(`\nFound in database: ${result.rows.length} records`);

      if (result.rows.length === 0) {
        console.log('❌ This transaction is NOT in the database!');
        console.log('   The scanner found it but did not save it.');
      }

      await pool.end();
      break;
    }
  }
}

checkTxid().catch(console.error);
