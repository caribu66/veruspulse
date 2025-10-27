#!/usr/bin/env node

/**
 * Investigate Missing 3K Rewards
 * Detailed analysis to find the discrepancy between our analysis and CSV mint data
 */

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function investigateMissingRewards() {
  console.log('🔍 INVESTIGATING MISSING 3K REWARDS');
  console.log('===================================\n');

  try {
    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // Read CSV data
    const csvPath = '/home/explorer/Documents/tx_export_1761068678152.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    const headers = lines[0].split(',');
    const csvData = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim();
      });
      return row;
    });

    const mintTransactions = csvData.filter(row => row.Type === 'mint');

    console.log('📊 DETAILED ANALYSIS:');
    console.log('=====================');

    // CSV Analysis
    const csvMintTotal = mintTransactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.Amount || 0);
    }, 0);

    console.log(`CSV Mint Total: ${csvMintTotal.toFixed(8)} VRSC`);
    console.log(`CSV Mint Count: ${mintTransactions.length}`);

    // Database Analysis
    const dbStakes = await pool.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        MIN(block_time) as first_stake,
        MAX(block_time) as last_stake
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [caribu66Address]
    );

    const dbCount = parseInt(dbStakes.rows[0].total_stakes);
    const dbFirst = dbStakes.rows[0].first_stake;
    const dbLast = dbStakes.rows[0].last_stake;

    console.log(`\nDatabase Stake Count: ${dbCount}`);
    console.log(
      `Database Date Range: ${dbFirst.toISOString().split('T')[0]} to ${dbLast.toISOString().split('T')[0]}`
    );

    // Check if CSV has more transactions than database
    const countDifference = mintTransactions.length - dbCount;
    console.log(`\n📊 COUNT DIFFERENCE:`);
    console.log(`CSV has ${countDifference} more transactions than database`);

    if (countDifference > 0) {
      console.log(`\n🔍 ANALYZING MISSING TRANSACTIONS:`);

      // Get date ranges from both sources
      const csvDates = mintTransactions.map(tx => tx.Date.split('T')[0]).sort();
      const csvStartDate = csvDates[0];
      const csvEndDate = csvDates[csvDates.length - 1];

      console.log(`CSV Date Range: ${csvStartDate} to ${csvEndDate}`);
      console.log(
        `Database Date Range: ${dbFirst.toISOString().split('T')[0]} to ${dbLast.toISOString().split('T')[0]}`
      );

      // Check if CSV covers a different time period
      const csvStart = new Date(csvStartDate);
      const csvEnd = new Date(csvEndDate);
      const dbStart = new Date(dbFirst);
      const dbEnd = new Date(dbLast);

      if (csvStart < dbStart) {
        console.log(
          `\n⚠️ CSV starts BEFORE database (${csvStartDate} vs ${dbFirst.toISOString().split('T')[0]})`
        );

        // Calculate missing rewards from earlier period
        const earlyCSVMints = mintTransactions.filter(tx => {
          const txDate = new Date(tx.Date);
          return txDate < dbStart;
        });

        const earlyTotal = earlyCSVMints.reduce(
          (sum, tx) => sum + parseFloat(tx.Amount || 0),
          0
        );
        console.log(
          `Early period mints: ${earlyCSVMints.length} transactions, ${earlyTotal.toFixed(8)} VRSC`
        );
      }

      if (csvEnd > dbEnd) {
        console.log(
          `\n⚠️ CSV ends AFTER database (${csvEndDate} vs ${dbLast.toISOString().split('T')[0]})`
        );

        // Calculate missing rewards from later period
        const lateCSVMints = mintTransactions.filter(tx => {
          const txDate = new Date(tx.Date);
          return txDate > dbEnd;
        });

        const lateTotal = lateCSVMints.reduce(
          (sum, tx) => sum + parseFloat(tx.Amount || 0),
          0
        );
        console.log(
          `Later period mints: ${lateCSVMints.length} transactions, ${lateTotal.toFixed(8)} VRSC`
        );
      }

      // Analyze the reward rates by year from CSV
      console.log(`\n📅 CSV REWARD RATES BY YEAR:`);
      const yearlyMints = {};

      mintTransactions.forEach(tx => {
        const year = tx.Date.split('-')[0];
        if (!yearlyMints[year]) {
          yearlyMints[year] = { count: 0, total: 0 };
        }
        yearlyMints[year].count++;
        yearlyMints[year].total += parseFloat(tx.Amount || 0);
      });

      Object.keys(yearlyMints)
        .sort()
        .forEach(year => {
          const data = yearlyMints[year];
          const avg = data.total / data.count;
          console.log(
            `   ${year}: ${data.count} mints, ${data.total.toFixed(8)} VRSC total, ${avg.toFixed(8)} VRSC average`
          );
        });

      // Recalculate our estimate with more accurate data
      console.log(`\n🎯 RECALCULATING WITH CSV DATA:`);

      let recalculatedTotal = 0;
      Object.keys(yearlyMints).forEach(year => {
        const yearInt = parseInt(year);
        const data = yearlyMints[year];

        // Use actual CSV average for each year
        const actualAvg = data.total / data.count;
        recalculatedTotal += data.total;

        console.log(
          `   ${year}: ${data.count} stakes × ${actualAvg.toFixed(8)} VRSC = ${data.total.toFixed(8)} VRSC`
        );
      });

      console.log(`\n📊 FINAL COMPARISON:`);
      console.log(`CSV Mint Total: ${csvMintTotal.toFixed(8)} VRSC`);
      console.log(`Our Recalculated: ${recalculatedTotal.toFixed(8)} VRSC`);
      console.log(
        `Difference: ${Math.abs(csvMintTotal - recalculatedTotal).toFixed(8)} VRSC`
      );

      if (Math.abs(csvMintTotal - recalculatedTotal) < 1) {
        console.log(
          `✅ Perfect match! The missing rewards are due to time period differences.`
        );
      } else {
        console.log(`⚠️ Still some discrepancy. Need to investigate further.`);
      }
    }
  } catch (error) {
    console.error('❌ Error investigating missing rewards:', error.message);
  } finally {
    await pool.end();
  }
}

investigateMissingRewards();
