#!/usr/bin/env node
/**
 * clean-utxo-reset.js
 * Clear all UTXO data for joanna@ and start fresh with proper methodology
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Cleaning UTXO Data for joanna@               ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

async function cleanUTXOData() {
  try {
    console.log(`🎯 Target: joanna@ (${JOANNA_IADDR})`);

    // Get current UTXO count and total value
    const beforeResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_utxos,
        SUM(value) as total_value_satoshis,
        SUM(value)/100000000 as total_value_vrsc
      FROM utxos
      WHERE address = $1
    `,
      [JOANNA_IADDR]
    );

    const before = beforeResult.rows[0];
    console.log(`📊 Before cleanup:`);
    console.log(`   💰 Total UTXOs: ${before.total_utxos}`);
    console.log(`   💎 Total value: ${before.total_value_vrsc} VRSC`);

    // Clear all UTXO data for joanna@
    console.log('\n🧹 Clearing all UTXO data...');
    const deleteResult = await db.query(
      'DELETE FROM utxos WHERE address = $1',
      [JOANNA_IADDR]
    );
    console.log(`✅ Deleted ${deleteResult.rowCount} UTXO records`);

    // Verify cleanup
    const afterResult = await db.query(
      `
      SELECT COUNT(*) as total_utxos
      FROM utxos
      WHERE address = $1
    `,
      [JOANNA_IADDR]
    );

    const after = afterResult.rows[0];
    console.log(`\n📊 After cleanup:`);
    console.log(`   💰 Total UTXOs: ${after.total_utxos}`);
    console.log(`   ✅ Cleanup successful!`);

    console.log('\n🎯 Next steps:');
    console.log('   1. Use RPC listunspent to get ACTUAL current UTXOs');
    console.log(
      '   2. Only track UTXOs from actual transactions, not inflated data'
    );
    console.log('   3. Separate UTXO tracking from staking rewards completely');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await db.end();
  }
}

cleanUTXOData().catch(console.error);
