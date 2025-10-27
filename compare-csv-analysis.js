#!/usr/bin/env node

/**
 * Compare CSV Analysis with Our Logic
 * Analyzes the CSV export data and compares it with our database analysis
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function compareCSVAnalysis() {
  console.log('🔍 COMPARING CSV EXPORT WITH OUR ANALYSIS');
  console.log('=========================================\n');

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

    console.log(`Found ${csvData.length} transactions in CSV`);
    console.log(`Headers: ${headers.join(', ')}`);

    // Find unique addresses
    const addresses = [...new Set(csvData.map(row => row.Address))].filter(
      Boolean
    );
    console.log(`\n📋 Addresses in CSV:`);
    addresses.forEach(addr => console.log(`   ${addr}`));

    // Check if any of these addresses are in our database
    for (const address of addresses) {
      console.log(`\n🔍 Checking address: ${address}`);

      // Check if it's in our identities table
      const identityResult = await pool.query(
        `
        SELECT identity_address, base_name, friendly_name
        FROM identities 
        WHERE identity_address = $1
      `,
        [address]
      );

      if (identityResult.rows.length > 0) {
        const identity = identityResult.rows[0];
        console.log(`✅ Found in identities table:`);
        console.log(`   Base name: ${identity.base_name}`);
        console.log(`   Friendly name: ${identity.friendly_name}`);

        // Check if this matches caribu66@
        if (
          identity.base_name.toLowerCase().includes('caribu') ||
          identity.friendly_name.toLowerCase().includes('caribu')
        ) {
          console.log(`🎯 FOUND CARIBU66@! Address: ${address}`);

          // Get staking data from our database
          const stakesResult = await pool.query(
            `
            SELECT 
              COUNT(*) as total_stakes,
              SUM(amount_sats) as total_amount_sats,
              MIN(block_height) as first_stake_block,
              MAX(block_height) as last_stake_block,
              MIN(block_time) as first_stake_time,
              MAX(block_time) as last_stake_time
            FROM staking_rewards 
            WHERE identity_address = $1
          `,
            [address]
          );

          const stakes = stakesResult.rows[0];
          const totalVRSC = (stakes.total_amount_sats / 100000000).toFixed(2);

          console.log(`\n📊 OUR DATABASE ANALYSIS:`);
          console.log(
            `   Total stakes: ${stakes.total_stakes.toLocaleString()}`
          );
          console.log(`   Total amount: ${totalVRSC} VRSC`);
          console.log(`   First stake: ${stakes.first_stake_time}`);
          console.log(`   Last stake: ${stakes.last_stake_time}`);

          // Analyze CSV data for this address
          const addressCSVData = csvData.filter(row => row.Address === address);
          const stakeTransactions = addressCSVData.filter(
            row => row.Type === 'stake'
          );

          console.log(`\n📊 CSV EXPORT ANALYSIS:`);
          console.log(`   Total transactions: ${addressCSVData.length}`);
          console.log(`   Stake transactions: ${stakeTransactions.length}`);

          if (stakeTransactions.length > 0) {
            const csvTotal = stakeTransactions.reduce((sum, tx) => {
              return sum + parseFloat(tx.Amount || 0);
            }, 0);

            console.log(`   Total stake amount: ${csvTotal.toFixed(8)} VRSC`);

            // Show date range from CSV
            const dates = stakeTransactions.map(tx => tx.Date).filter(Boolean);
            if (dates.length > 0) {
              const sortedDates = dates.sort();
              console.log(
                `   Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
              );
            }

            // Compare our analysis with CSV data
            console.log(`\n🔍 COMPARISON:`);
            console.log(`   Our database: ${totalVRSC} VRSC`);
            console.log(`   CSV export: ${csvTotal.toFixed(8)} VRSC`);

            const difference = Math.abs(parseFloat(totalVRSC) - csvTotal);
            const percentDiff = (difference / csvTotal) * 100;

            console.log(
              `   Difference: ${difference.toFixed(8)} VRSC (${percentDiff.toFixed(2)}%)`
            );

            if (percentDiff < 5) {
              console.log(`   ✅ Our analysis is very close to CSV data!`);
            } else if (percentDiff < 20) {
              console.log(
                `   ⚠️ Our analysis has some differences from CSV data`
              );
            } else {
              console.log(
                `   ❌ Significant difference between our analysis and CSV data`
              );
            }
          }
        }
      } else {
        console.log(`❌ Address not found in our identities table`);

        // Check if it's in staking_rewards table directly
        const stakesResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards 
          WHERE identity_address = $1
        `,
          [address]
        );

        if (stakesResult.rows[0].count > 0) {
          console.log(
            `✅ Found in staking_rewards table (${stakesResult.rows[0].count} stakes)`
          );
        } else {
          console.log(`❌ Not found in staking_rewards table either`);
        }
      }
    }

    // If no caribu66@ found, let's search more broadly
    console.log(`\n🔍 BROADER SEARCH FOR CARIBU66@:`);
    const caribuSearchResult = await pool.query(`
      SELECT identity_address, base_name, friendly_name
      FROM identities 
      WHERE LOWER(base_name) LIKE '%caribu%' 
         OR LOWER(friendly_name) LIKE '%caribu%'
         OR LOWER(identity_address) LIKE '%caribu%'
    `);

    if (caribuSearchResult.rows.length > 0) {
      console.log(
        `✅ Found ${caribuSearchResult.rows.length} identities containing "caribu":`
      );
      caribuSearchResult.rows.forEach((identity, index) => {
        console.log(`   ${index + 1}. ${identity.identity_address}`);
        console.log(`      Base name: ${identity.base_name}`);
        console.log(`      Friendly name: ${identity.friendly_name}`);
      });
    } else {
      console.log(`❌ No identities found containing "caribu"`);
      console.log(
        `💡 The CSV might be for a different address or the identity might not be in our database`
      );
    }
  } catch (error) {
    console.error('❌ Error comparing CSV analysis:', error.message);
  } finally {
    await pool.end();
  }
}

compareCSVAnalysis();
