#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 1,
});

async function addMissingCSVTransactions() {
  try {
    console.log('🔍 Adding missing CSV transactions to database...');

    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // Parse CSV data to get transaction IDs
    const csvContent = fs.readFileSync(
      '/home/explorer/Documents/tx_export_1761068678152.csv',
      'utf8'
    );
    const lines = csvContent.split('\n');

    let csvMintTxIDs = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',');
      if (columns.length < 9) continue;

      const type = columns[0];
      const amount = parseFloat(columns[1]) || 0;
      const date = columns[3];
      const txid = columns[7]; // TxID column

      if (type.toLowerCase() === 'mint') {
        csvMintTxIDs.push({
          txid: txid,
          amount: amount,
          date: date,
          type: type,
        });
      }
    }

    console.log(`Found ${csvMintTxIDs.length} mint transactions in CSV`);

    // Get all caribu66@ transaction IDs from database
    const dbTxIDs = await pool.query(
      'SELECT txid FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );

    const dbTxIDSet = new Set(dbTxIDs.rows.map(row => row.txid));

    // Find missing transactions
    const missingTxIDs = csvMintTxIDs.filter(tx => !dbTxIDSet.has(tx.txid));

    console.log(`Missing transactions: ${missingTxIDs.length}`);

    let addedCount = 0;
    let totalAdded = 0;
    let errors = 0;

    console.log('\n🔍 Adding missing transactions...');

    for (let i = 0; i < missingTxIDs.length; i++) {
      const tx = missingTxIDs[i];

      try {
        console.log(
          `\n[${i + 1}/${missingTxIDs.length}] Processing ${tx.txid}...`
        );

        // Get transaction details from blockchain
        const txData = execSync(
          `/home/explorer/verus-cli/verus gettransaction ${tx.txid}`,
          { encoding: 'utf8' }
        );
        const txObj = JSON.parse(txData);

        if (txObj.confirmations && txObj.confirmations > 0) {
          // Get block details
          const blockHash = txObj.blockhash;
          const blockData = execSync(
            `/home/explorer/verus-cli/verus getblock ${blockHash} 2`,
            { encoding: 'utf8' }
          );
          const block = JSON.parse(blockData);

          // Add the transaction to database
          const rewardAmount = Math.round(tx.amount * 100000000);

          await pool.query(
            `
            INSERT INTO staking_rewards (
              identity_address, txid, vout, block_height, block_time,
              amount_sats, classifier, source_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (txid, vout) DO NOTHING
          `,
            [
              caribu66Address,
              tx.txid,
              0,
              block.height,
              new Date(tx.date),
              rewardAmount,
              'stake_reward',
              caribu66Address,
            ]
          );

          console.log(
            `   ✅ Added: ${tx.amount.toFixed(8)} VRSC at ${tx.date}`
          );
          addedCount++;
          totalAdded += tx.amount;
        } else {
          console.log(`   ⚠️  Transaction not confirmed: ${tx.txid}`);
        }

        // Progress update
        if ((i + 1) % 50 === 0) {
          console.log(
            `\n📊 Progress: ${i + 1}/${missingTxIDs.length} processed, ${addedCount} added, ${totalAdded.toFixed(8)} VRSC`
          );
        }
      } catch (error) {
        console.log(`   ❌ Error processing ${tx.txid}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n🎉 COMPLETE!`);
    console.log(`   Processed: ${missingTxIDs.length} transactions`);
    console.log(`   Added: ${addedCount} transactions`);
    console.log(`   Total added: ${totalAdded.toFixed(8)} VRSC`);
    console.log(`   Errors: ${errors}`);

    // Check final totals
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount_sats) as total_sats FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );

    const finalCount = parseInt(totalResult.rows[0].count);
    const finalAmount = parseInt(totalResult.rows[0].total_sats) / 100000000;

    console.log(`\n📊 FINAL TOTALS:`);
    console.log(`   Total stakes: ${finalCount.toLocaleString()}`);
    console.log(`   Total amount: ${finalAmount.toFixed(8)} VRSC`);

    // Compare with CSV
    const csvAmount = 8729.27650198;
    const difference = csvAmount - finalAmount;

    console.log(`\n🔍 COMPARISON WITH CSV:`);
    console.log(`   CSV Mint: ${csvAmount.toFixed(8)} VRSC`);
    console.log(`   Database: ${finalAmount.toFixed(8)} VRSC`);
    console.log(`   Difference: ${difference.toFixed(8)} VRSC`);

    if (Math.abs(difference) < 10) {
      console.log(`\n✅ PERFECT MATCH! Database now matches CSV!`);
    } else if (Math.abs(difference) < 50) {
      console.log(`\n✅ EXCELLENT MATCH! Very close to CSV amount.`);
    } else {
      console.log(`\n⚠️  Still some difference remaining.`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingCSVTransactions();
