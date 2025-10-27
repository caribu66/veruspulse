const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function compareWithCSV() {
  console.log('🔍 COMPARING DATABASE WITH CSV EXPORT');
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );
  console.log('');

  // Read CSV file
  const csvFile = '/home/explorer/Documents/tx_export_1761068678152.csv';

  if (!fs.existsSync(csvFile)) {
    console.log('❌ CSV file not found:', csvFile);
    return;
  }

  const csvContent = fs.readFileSync(csvFile, 'utf8');
  const csvLines = csvContent.split('\n').filter(line => line.trim());

  console.log(`📄 CSV file: ${csvFile}`);
  console.log(`📊 CSV lines: ${csvLines.length}`);
  console.log('');

  // Parse CSV (assuming format: txid,block_height,amount,date,etc)
  const csvStakes = [];
  for (let i = 1; i < csvLines.length; i++) {
    // Skip header
    const parts = csvLines[i].split(',');
    if (parts.length >= 4) {
      csvStakes.push({
        txid: parts[0],
        block_height: parseInt(parts[1]),
        amount: parseFloat(parts[2]),
        date: parts[3],
      });
    }
  }

  console.log(`📈 Parsed CSV stakes: ${csvStakes.length}`);
  console.log('');

  // Get database stakes for caribu66@
  const dbResult = await pool.query(`
    SELECT txid, block_height, amount_sats::numeric/100000000 as amount_vrsc, block_time
    FROM staking_rewards 
    WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
    ORDER BY block_height
  `);

  const dbStakes = dbResult.rows;
  console.log(`🗄️ Database stakes: ${dbStakes.length}`);
  console.log('');

  // Compare counts
  console.log('📊 COMPARISON SUMMARY');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`CSV stakes:           ${csvStakes.length}`);
  console.log(`Database stakes:       ${dbStakes.length}`);
  console.log(`Difference:           ${dbStakes.length - csvStakes.length}`);
  console.log('');

  // Check for missing stakes
  const csvTxids = new Set(csvStakes.map(s => s.txid));
  const dbTxids = new Set(dbStakes.map(s => s.txid));

  const missingInDb = csvStakes.filter(s => !dbTxids.has(s.txid));
  const extraInDb = dbStakes.filter(s => !csvTxids.has(s.txid));

  console.log('🔍 DETAILED ANALYSIS');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`Missing in database:  ${missingInDb.length}`);
  console.log(`Extra in database:    ${extraInDb.length}`);
  console.log('');

  if (missingInDb.length > 0) {
    console.log('❌ Missing stakes in database:');
    missingInDb.slice(0, 10).forEach(stake => {
      console.log(
        `   ${stake.txid} - Block ${stake.block_height} - ${stake.amount} VRSC`
      );
    });
    if (missingInDb.length > 10) {
      console.log(`   ... and ${missingInDb.length - 10} more`);
    }
    console.log('');
  }

  if (extraInDb.length > 0) {
    console.log('➕ Extra stakes in database:');
    extraInDb.slice(0, 10).forEach(stake => {
      console.log(
        `   ${stake.txid} - Block ${stake.block_height} - ${stake.amount_vrsc} VRSC`
      );
    });
    if (extraInDb.length > 10) {
      console.log(`   ... and ${extraInDb.length - 10} more`);
    }
    console.log('');
  }

  // Date range comparison
  if (csvStakes.length > 0 && dbStakes.length > 0) {
    const csvMinDate = csvStakes.reduce(
      (min, s) => (s.date < min ? s.date : min),
      csvStakes[0].date
    );
    const csvMaxDate = csvStakes.reduce(
      (max, s) => (s.date > max ? s.date : max),
      csvStakes[0].date
    );

    const dbMinDate = dbStakes.reduce(
      (min, s) => (s.block_time < min ? s.block_time : min),
      dbStakes[0].block_time
    );
    const dbMaxDate = dbStakes.reduce(
      (max, s) => (s.block_time > max ? s.block_time : max),
      dbStakes[0].block_time
    );

    console.log('📅 DATE RANGES');
    console.log(
      '──────────────────────────────────────────────────────────────'
    );
    console.log(`CSV range:           ${csvMinDate} to ${csvMaxDate}`);
    console.log(
      `Database range:      ${dbMinDate.toISOString().split('T')[0]} to ${dbMaxDate.toISOString().split('T')[0]}`
    );
    console.log('');
  }

  // Summary
  if (missingInDb.length === 0 && extraInDb.length === 0) {
    console.log('✅ PERFECT MATCH! Database and CSV are identical.');
  } else if (missingInDb.length === 0) {
    console.log('✅ All CSV stakes found in database (with some extras).');
  } else {
    console.log('⚠️ Some discrepancies found. See details above.');
  }

  await pool.end();
}

compareWithCSV().catch(console.error);
