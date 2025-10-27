#!/usr/bin/env node

/**
 * Analyze CSV Mint Transactions
 * Separate analysis of "mint" transactions to understand the correct staking structure
 */

const fs = require('fs');

async function analyzeCSVMintTransactions() {
  console.log('🔍 ANALYZING CSV MINT TRANSACTIONS');
  console.log('==================================\n');

  try {
    const csvPath = '/home/explorer/Documents/tx_export_1761068678152.csv';

    // Read CSV file
    console.log('📊 Reading CSV export file...');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Parse CSV data
    const headers = lines[0].split(',');
    const csvData = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim();
      });
      return row;
    });

    console.log(`Found ${csvData.length} total transactions in CSV`);

    // Separate by transaction type
    const stakeTransactions = csvData.filter(row => row.Type === 'stake');
    const mintTransactions = csvData.filter(row => row.Type === 'mint');
    const otherTransactions = csvData.filter(
      row => row.Type !== 'stake' && row.Type !== 'mint'
    );

    console.log(`\n📊 TRANSACTION BREAKDOWN:`);
    console.log(`   Stake transactions: ${stakeTransactions.length}`);
    console.log(`   Mint transactions: ${mintTransactions.length}`);
    console.log(`   Other transactions: ${otherTransactions.length}`);

    // Analyze stake transactions
    if (stakeTransactions.length > 0) {
      console.log(`\n🎯 STAKE TRANSACTIONS ANALYSIS:`);
      console.log(`===============================`);

      const stakeTotal = stakeTransactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.Amount || 0);
      }, 0);

      console.log(`   Total stake amount: ${stakeTotal.toFixed(8)} VRSC`);

      // Show sample stake transactions
      console.log(`   Sample stake transactions:`);
      stakeTransactions.slice(0, 5).forEach((tx, index) => {
        console.log(
          `      ${index + 1}. ${tx.Date}: ${tx.Amount} VRSC (Block: ${tx.Confirmations})`
        );
      });
    }

    // Analyze mint transactions
    if (mintTransactions.length > 0) {
      console.log(`\n🪙 MINT TRANSACTIONS ANALYSIS:`);
      console.log(`==============================`);

      const mintTotal = mintTransactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.Amount || 0);
      }, 0);

      console.log(`   Total mint amount: ${mintTotal.toFixed(8)} VRSC`);
      console.log(`   Number of mint transactions: ${mintTransactions.length}`);
      console.log(
        `   Average mint amount: ${(mintTotal / mintTransactions.length).toFixed(8)} VRSC`
      );

      // Show sample mint transactions
      console.log(`   Sample mint transactions:`);
      mintTransactions.slice(0, 10).forEach((tx, index) => {
        console.log(`      ${index + 1}. ${tx.Date}: ${tx.Amount} VRSC`);
      });

      // Analyze mint amounts distribution
      const mintAmounts = mintTransactions.map(tx =>
        parseFloat(tx.Amount || 0)
      );
      const minMint = Math.min(...mintAmounts);
      const maxMint = Math.max(...mintAmounts);
      const avgMint = mintTotal / mintTransactions.length;

      console.log(`\n   📊 Mint Amount Statistics:`);
      console.log(`      Minimum: ${minMint.toFixed(8)} VRSC`);
      console.log(`      Maximum: ${maxMint.toFixed(8)} VRSC`);
      console.log(`      Average: ${avgMint.toFixed(8)} VRSC`);

      // Check if mint amounts are realistic (around 3 VRSC)
      const realisticMints = mintTransactions.filter(tx => {
        const amount = parseFloat(tx.Amount || 0);
        return amount >= 2.5 && amount <= 4.0; // Realistic staking reward range
      });

      const realisticMintTotal = realisticMints.reduce((sum, tx) => {
        return sum + parseFloat(tx.Amount || 0);
      }, 0);

      console.log(`\n   ✅ Realistic Mint Transactions (2.5-4.0 VRSC):`);
      console.log(`      Count: ${realisticMints.length}`);
      console.log(`      Total: ${realisticMintTotal.toFixed(8)} VRSC`);
      console.log(
        `      Average: ${(realisticMintTotal / realisticMints.length).toFixed(8)} VRSC`
      );

      // Group mint transactions by date to see patterns
      const mintByDate = {};
      mintTransactions.forEach(tx => {
        const date = tx.Date.split('T')[0]; // Get just the date part
        if (!mintByDate[date]) {
          mintByDate[date] = [];
        }
        mintByDate[date].push(tx);
      });

      const datesWithMints = Object.keys(mintByDate).sort();
      console.log(`\n   📅 Mint transactions by date (sample):`);
      datesWithMints.slice(0, 10).forEach(date => {
        const mints = mintByDate[date];
        const dayTotal = mints.reduce(
          (sum, tx) => sum + parseFloat(tx.Amount || 0),
          0
        );
        console.log(
          `      ${date}: ${mints.length} mints, ${dayTotal.toFixed(8)} VRSC total`
        );
      });
    }

    // Compare stake vs mint totals
    console.log(`\n📊 COMPARISON SUMMARY:`);
    console.log(`======================`);

    const stakeTotal = stakeTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.Amount || 0),
      0
    );
    const mintTotal = mintTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.Amount || 0),
      0
    );

    console.log(`   Total Stake Amount: ${stakeTotal.toFixed(8)} VRSC`);
    console.log(`   Total Mint Amount: ${mintTotal.toFixed(8)} VRSC`);
    console.log(
      `   Difference: ${Math.abs(stakeTotal - mintTotal).toFixed(8)} VRSC`
    );

    if (Math.abs(stakeTotal - mintTotal) < 1000) {
      console.log(`   ✅ Stake and mint totals are very close!`);
    } else {
      console.log(`   ⚠️ Significant difference between stake and mint totals`);
    }

    console.log(`\n💡 INSIGHT:`);
    console.log(`===========`);
    console.log(
      `The "mint" transactions likely represent the actual staking rewards`
    );
    console.log(
      `while "stake" transactions might represent the staked amount or total output.`
    );
    console.log(
      `This would explain why mint amounts (~3 VRSC) are realistic while`
    );
    console.log(`stake amounts are inflated.`);
  } catch (error) {
    console.error('❌ Error analyzing CSV mint transactions:', error.message);
  }
}

analyzeCSVMintTransactions();
