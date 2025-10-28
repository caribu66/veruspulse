import { UTXODatabaseService } from '../lib/services/utxo-database.ts';
import { VerusAPIClient } from '../lib/rpc-client-robust.ts';
import { getRpcConfig } from '../lib/utils/rpc-config.ts';

/**
 * Test UTXO population with joanna@
 */

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'; // joanna@

async function testUTXOPopulation() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Testing UTXO Population with joanna@             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const rpcConfig = getRpcConfig();
  const verusApiClient = new VerusAPIClient(rpcConfig);
  const utxoDb = new UTXODatabaseService(process.env.DATABASE_URL);

  try {
    // Get current blockchain height
    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await verusApiClient.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    console.log(`✅ Current height: ${currentHeight}\n`);

    // Get UTXOs from daemon
    console.log('🔍 Getting UTXOs from daemon...');
    const daemonUtxos = await verusApiClient.getAddressUTXOs(JOANNA_IADDR);
    console.log(`✅ Daemon reports ${daemonUtxos.length} UTXOs\n`);

    // Check current database state
    console.log('📊 Current database state:');
    const existingUtxos = await utxoDb.getUTXOs(JOANNA_IADDR);
    console.log(`   Existing UTXOs in DB: ${existingUtxos.length}`);
    const unspentCount = existingUtxos.filter(u => !u.isSpent).length;
    console.log(`   Unspent: ${unspentCount}`);
    console.log(`   Spent: ${existingUtxos.length - unspentCount}\n`);

    // Mark all existing UTXOs as spent
    console.log('🧹 Marking all existing UTXOs as spent...');
    await utxoDb.markAllUTXOsAsSpent(JOANNA_IADDR);
    console.log('✅ Done\n');

    // Process each UTXO from daemon
    console.log('💾 Inserting/updating UTXOs from daemon...');
    let insertedCount = 0;
    let totalValue = 0;
    let eligibleCount = 0;

    for (const utxo of daemonUtxos) {
      const value = utxo.satoshis || 0;
      const height = utxo.height || 0;
      const blocktime = utxo.blocktime || 0;
      const txid = utxo.txid;
      const vout =
        utxo.outputIndex !== undefined ? utxo.outputIndex : utxo.vout;

      if (!txid || vout === undefined) {
        console.log(`   ⚠️  Skipping invalid UTXO (missing txid or vout)`);
        continue;
      }

      const confirmations = height ? currentHeight - height : 0;
      const isEligible = confirmations >= 150;

      const utxoData = {
        address: JOANNA_IADDR,
        txid,
        vout,
        value,
        creation_height: height,
        creation_time: blocktime ? new Date(blocktime * 1000) : null,
        is_spent: false,
        is_eligible: isEligible,
        staking_probability: 0,
        estimated_reward: 0,
      };

      await utxoDb.upsertUTXO(utxoData);
      insertedCount++;
      totalValue += value;
      if (isEligible) eligibleCount++;
    }

    console.log(`✅ Processed ${insertedCount} UTXOs\n`);

    // Verify database state
    console.log('✅ Final database state:');
    const finalUtxos = await utxoDb.getUTXOs(JOANNA_IADDR);
    console.log(`   Total UTXOs: ${finalUtxos.length}`);
    const finalUnspent = finalUtxos.filter(u => !u.isSpent).length;
    console.log(`   Unspent: ${finalUnspent}`);
    console.log(`   Eligible: ${eligibleCount}`);
    console.log(
      `   Total value: ${(totalValue / 100000000).toFixed(2)} VRSC\n`
    );

    // Compare with daemon
    console.log('📊 Comparison:');
    console.log(`   Daemon UTXOs: ${daemonUtxos.length}`);
    console.log(`   Database UTXOs (unspent): ${finalUnspent}`);
    console.log(
      `   Match: ${daemonUtxos.length === finalUnspent ? '✅ YES' : '❌ NO'}\n`
    );

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║              TEST COMPLETE                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testUTXOPopulation().catch(console.error);
