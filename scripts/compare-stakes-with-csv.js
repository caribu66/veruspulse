#!/usr/bin/env node
/**
 * compare-stakes-with-csv.js
 * Compare database stakes with CSV export from wallet
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function compareStakes(verusidName, csvPath) {
  try {
    console.log(`📊 Comparing stakes for ${verusidName} with CSV data\n`);

    // Step 1: Get VerusID from database
    const idResult = await pool.query(
      `
      SELECT identity_address, friendly_name
      FROM identities
      WHERE friendly_name ILIKE $1 OR base_name ILIKE $2
      LIMIT 1
    `,
      [verusidName, verusidName.replace('@', '')]
    );

    if (idResult.rows.length === 0) {
      throw new Error(`VerusID not found: ${verusidName}`);
    }

    const verusid = idResult.rows[0];
    console.log(`✅ VerusID: ${verusid.friendly_name}`);
    console.log(`   Address: ${verusid.identity_address}\n`);

    // Step 2: Get database stakes
    const dbStakes = await pool.query(
      `
      SELECT 
        block_height,
        txid,
        amount_sats,
        block_time
      FROM staking_rewards
      WHERE identity_address = $1
      ORDER BY block_height
    `,
      [verusid.identity_address]
    );

    console.log(`📊 Database has ${dbStakes.rows.length} stakes\n`);

    // Step 3: Read CSV file
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvLines = csvContent.trim().split('\n');
    const csvHeader = csvLines[0];

    console.log(`📄 CSV file: ${csvPath}`);
    console.log(`   Lines: ${csvLines.length}`);
    console.log(`   Header: ${csvHeader}\n`);

    // Parse CSV stakes
    const csvStakes = [];
    for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i];
      if (!line.trim()) continue;

      // Parse CSV line (adjust based on actual CSV format)
      const parts = line.split(',');

      // Try to extract: txid, block height, amount, date
      // Format may vary - adjust as needed
      csvStakes.push({
        line: i + 1,
        raw: line,
        parts: parts,
      });
    }

    console.log(`📄 CSV has ${csvStakes.length} entries\n`);

    // Step 4: Show sample data for format detection
    console.log(`📋 Sample CSV entries (first 5):\n`);
    csvStakes.slice(0, 5).forEach(entry => {
      console.log(`   Line ${entry.line}: ${entry.raw}`);
    });
    console.log('');

    // Step 5: Show sample database entries
    console.log(`📋 Sample Database stakes (first 5):\n`);
    dbStakes.rows.slice(0, 5).forEach(stake => {
      console.log(
        `   Block ${stake.block_height} | ${stake.txid} | ${(stake.amount_sats / 100000000).toFixed(8)} VRSC | ${stake.block_time}`
      );
    });
    console.log('');

    // Step 6: Summary comparison
    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║   COMPARISON SUMMARY                                      ║`
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`
    );

    console.log(`Database stakes: ${dbStakes.rows.length}`);
    console.log(`CSV entries: ${csvStakes.length}`);
    console.log(
      `Difference: ${Math.abs(dbStakes.rows.length - csvStakes.length)}`
    );

    if (dbStakes.rows.length === csvStakes.length) {
      console.log(
        `\n✅ COUNT MATCHES! Both have ${dbStakes.rows.length} entries`
      );
    } else if (dbStakes.rows.length > csvStakes.length) {
      console.log(
        `\n⚠️  Database has MORE stakes (${dbStakes.rows.length - csvStakes.length} extra)`
      );
    } else {
      console.log(
        `\n⚠️  CSV has MORE entries (${csvStakes.length - dbStakes.rows.length} extra)`
      );
      console.log(`   This might indicate missing stakes in database!`);
    }

    // Step 7: Total rewards comparison
    const dbTotal = dbStakes.rows.reduce(
      (sum, s) => sum + BigInt(s.amount_sats),
      BigInt(0)
    );
    const dbTotalVRSC = Number(dbTotal) / 100000000;

    console.log(`\n📊 Database total rewards: ${dbTotalVRSC.toFixed(8)} VRSC`);

    // Step 8: Export database stakes to CSV for manual comparison
    const exportPath = `/home/explorer/verus-dapp/${verusidName.replace('@', '')}_db_stakes.csv`;
    const exportLines = [
      'Block Height,TXID,Amount VRSC,Amount Sats,Block Time',
    ];

    dbStakes.rows.forEach(stake => {
      exportLines.push(
        `${stake.block_height},${stake.txid},${(stake.amount_sats / 100000000).toFixed(8)},${stake.amount_sats},${stake.block_time.toISOString()}`
      );
    });

    fs.writeFileSync(exportPath, exportLines.join('\n'));
    console.log(`\n💾 Exported database stakes to: ${exportPath}`);
    console.log(`   You can now manually compare with the wallet CSV\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main
const verusidName = process.argv[2];
const csvPath = process.argv[3];

if (!verusidName || !csvPath) {
  console.log('Usage: node compare-stakes-with-csv.js <verusid> <csv-path>');
  console.log(
    'Example: node compare-stakes-with-csv.js "caribu66@" "/path/to/stakes.csv"'
  );
  process.exit(1);
}

compareStakes(verusidName, csvPath).catch(console.error);
