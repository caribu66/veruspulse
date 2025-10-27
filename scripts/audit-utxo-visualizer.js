#!/usr/bin/env node

/**
 * Audit UTXO Visualizer Component
 * Identifies inconsistencies between visual display and data counts
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function auditUTXOVisualizer() {
  console.log('🔍 Auditing UTXO Visualizer Component\n');

  try {
    // Get a sample VerusID to test
    const sampleResult = await pool.query(`
      SELECT address, friendly_name, total_stakes
      FROM verusid_statistics 
      WHERE total_stakes > 0
      ORDER BY total_stakes DESC
      LIMIT 1
    `);

    if (sampleResult.rows.length === 0) {
      console.log('❌ No VerusIDs found for testing');
      return;
    }

    const testVerusID = sampleResult.rows[0];
    console.log(
      `📊 Testing with VerusID: ${testVerusID.friendly_name || testVerusID.address.substring(0, 20)}...`
    );

    // Test the live-utxos API endpoint
    console.log('\n🔧 Testing Live UTXOs API...');
    const apiUrl = `http://localhost:3000/api/verusid/${testVerusID.address}/live-utxos`;
    console.log(`   URL: ${apiUrl}`);

    const fetch = require('node-fetch');
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.success) {
      console.log(`❌ API Error: ${data.error}`);
      return;
    }

    const utxoData = data.data;
    console.log('\n📈 UTXO Data Analysis:');
    console.log(`   Total UTXOs: ${utxoData.total}`);
    console.log(`   Eligible: ${utxoData.eligible}`);
    console.log(`   Cooldown: ${utxoData.cooldown}`);
    console.log(`   Inactive: ${utxoData.inactive}`);
    console.log(`   Total Value: ${utxoData.totalValueVRSC.toFixed(2)} VRSC`);

    // Analyze individual UTXO statuses
    console.log('\n🔍 Individual UTXO Status Analysis:');
    const statusCounts = {};
    utxoData.utxos.forEach(utxo => {
      statusCounts[utxo.status] = (statusCounts[utxo.status] || 0) + 1;
    });

    console.log('   Status counts from individual UTXOs:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });

    // Check for inconsistencies
    console.log('\n🚨 Inconsistency Check:');
    const inconsistencies = [];

    if (utxoData.eligible !== statusCounts.eligible) {
      inconsistencies.push(
        `Eligible count mismatch: API says ${utxoData.eligible}, UTXOs say ${statusCounts.eligible || 0}`
      );
    }

    if (utxoData.cooldown !== statusCounts.cooldown) {
      inconsistencies.push(
        `Cooldown count mismatch: API says ${utxoData.cooldown}, UTXOs say ${statusCounts.cooldown || 0}`
      );
    }

    if (utxoData.inactive !== statusCounts.inactive) {
      inconsistencies.push(
        `Inactive count mismatch: API says ${utxoData.inactive}, UTXOs say ${statusCounts.inactive || 0}`
      );
    }

    if (inconsistencies.length === 0) {
      console.log('   ✅ No inconsistencies found in API data');
    } else {
      console.log('   ❌ Found inconsistencies:');
      inconsistencies.forEach(issue => console.log(`     - ${issue}`));
    }

    // Test the bubble chart component logic
    console.log('\n🎨 Testing Bubble Chart Logic:');

    // Simulate the bubble chart filtering
    const bubbles = utxoData.utxos.map(u => ({
      value: u.valueVRSC || 0,
      confirmations: u.confirmations || 0,
      status: u.status || 'inactive',
      txid: u.txid,
    }));

    const bubbleCounts = {
      eligible: bubbles.filter(b => b.status === 'eligible').length,
      cooldown: bubbles.filter(b => b.status === 'cooldown').length,
      inactive: bubbles.filter(b => b.status === 'inactive').length,
    };

    console.log('   Bubble chart counts:');
    console.log(`     Eligible: ${bubbleCounts.eligible}`);
    console.log(`     Cooldown: ${bubbleCounts.cooldown}`);
    console.log(`     Inactive: ${bubbleCounts.inactive}`);

    // Check for visual inconsistencies
    console.log('\n👁️ Visual Inconsistency Analysis:');

    if (bubbleCounts.cooldown === 0 && utxoData.cooldown > 0) {
      console.log(
        '   ❌ CRITICAL: Cooldown count shows 0 in legend but data shows cooldown UTXOs exist'
      );
      console.log(
        '      This would cause the green dot in COOLDOWN section with "Cooldown (0)" legend'
      );
    }

    if (bubbleCounts.eligible === 0 && utxoData.eligible > 0) {
      console.log(
        '   ❌ CRITICAL: Eligible count shows 0 in legend but data shows eligible UTXOs exist'
      );
    }

    // Check for specific UTXO details that might cause issues
    console.log('\n🔍 UTXO Details Analysis:');
    const cooldownUtxos = utxoData.utxos.filter(u => u.status === 'cooldown');
    if (cooldownUtxos.length > 0) {
      console.log('   Cooldown UTXOs found:');
      cooldownUtxos.slice(0, 3).forEach((utxo, i) => {
        console.log(
          `     ${i + 1}. ${utxo.txid.substring(0, 16)}... - ${utxo.valueVRSC.toFixed(2)} VRSC, ${utxo.confirmations} confirmations`
        );
      });
    }

    // Test with a different VerusID to see if issue is consistent
    console.log('\n🔄 Testing with another VerusID...');
    const anotherResult = await pool.query(
      `
      SELECT address, friendly_name
      FROM verusid_statistics 
      WHERE address != $1 AND total_stakes > 0
      ORDER BY total_stakes DESC
      LIMIT 1
    `,
      [testVerusID.address]
    );

    if (anotherResult.rows.length > 0) {
      const anotherVerusID = anotherResult.rows[0];
      const anotherResponse = await fetch(
        `http://localhost:3000/api/verusid/${anotherVerusID.address}/live-utxos`
      );
      const anotherData = await anotherResponse.json();

      if (anotherData.success) {
        const anotherUtxoData = anotherData.data;
        console.log(
          `   Testing: ${anotherVerusID.friendly_name || anotherVerusID.address.substring(0, 20)}...`
        );
        console.log(
          `   Total: ${anotherUtxoData.total}, Eligible: ${anotherUtxoData.eligible}, Cooldown: ${anotherUtxoData.cooldown}, Inactive: ${anotherUtxoData.inactive}`
        );

        const anotherStatusCounts = {};
        anotherUtxoData.utxos.forEach(utxo => {
          anotherStatusCounts[utxo.status] =
            (anotherStatusCounts[utxo.status] || 0) + 1;
        });

        const anotherInconsistencies = [];
        if (anotherUtxoData.cooldown !== anotherStatusCounts.cooldown) {
          anotherInconsistencies.push(
            `Cooldown mismatch: ${anotherUtxoData.cooldown} vs ${anotherStatusCounts.cooldown || 0}`
          );
        }

        if (anotherInconsistencies.length > 0) {
          console.log('   ❌ Found inconsistencies in second test:');
          anotherInconsistencies.forEach(issue =>
            console.log(`     - ${issue}`)
          );
        } else {
          console.log('   ✅ No inconsistencies in second test');
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error during audit: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// Run the audit
if (require.main === module) {
  auditUTXOVisualizer().catch(console.error);
}

module.exports = { auditUTXOVisualizer };
