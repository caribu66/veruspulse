#!/usr/bin/env node
/**
 * Verify stake detection logic by examining actual PoS blocks
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// RPC helper
async function rpcCall(method, params = []) {
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'verify',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

async function verifyStakeDetection() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║    VERIFY STAKE DETECTION LOGIC              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Test with a known PoS block from joanna@
  const testBlocks = [
    1077805, // First known stake for joanna@
    1998320, // Another known stake
    2405932, // Last stake in original data
  ];

  const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

  for (const height of testBlocks) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Analyzing Block ${height.toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const hash = await rpcCall('getblockhash', [height]);
      const block = await rpcCall('getblock', [hash, 2]);

      console.log(`Block Hash: ${block.hash}`);
      console.log(`Block Type: ${block.blocktype || 'N/A'}`);
      console.log(`Validation Type: ${block.validationtype || 'N/A'}`);
      console.log(
        `Is PoS: ${block.validationtype === 'stake' || block.blocktype === 'minted' ? '✅ YES' : '❌ NO'}`
      );
      console.log(`Transactions: ${block.tx.length}\n`);

      if (block.validationtype === 'stake' || block.blocktype === 'minted') {
        const coinstake = block.tx[0];
        console.log(`📋 Coinstake Transaction (tx[0]):`);
        console.log(`   TXID: ${coinstake.txid}`);
        console.log(`   Inputs (vin): ${coinstake.vin.length}`);
        console.log(`   Outputs (vout): ${coinstake.vout.length}\n`);

        // Analyze each vout
        console.log(`🔍 Output Analysis:`);
        let joannaFound = false;
        let totalOutput = 0;

        for (let i = 0; i < coinstake.vout.length; i++) {
          const vout = coinstake.vout[i];
          const addresses = vout.scriptPubKey?.addresses || [];
          const value = vout.value;
          totalOutput += value;

          const hasJoanna = addresses.includes(JOANNA_IADDR);

          console.log(`   vout[${i}]:`);
          console.log(
            `      Value: ${value.toFixed(8)} VRSC (${(value * 100000000).toFixed(0)} sats)`
          );
          console.log(
            `      Addresses: ${addresses.length > 0 ? addresses.join(', ') : 'NONE'}`
          );
          if (hasJoanna) {
            console.log(`      ⭐ CONTAINS joanna@ I-address!`);
            joannaFound = true;
          }
          console.log(``);
        }

        // Analyze inputs to calculate actual reward
        console.log(`💰 Input Analysis:`);
        let totalInput = 0;
        for (let i = 0; i < coinstake.vin.length; i++) {
          const vin = coinstake.vin[i];
          if (vin.coinbase) {
            console.log(`   vin[${i}]: COINBASE (empty input for PoS)`);
          } else {
            console.log(`   vin[${i}]: txid ${vin.txid}, vout ${vin.vout}`);
            // Note: We'd need to fetch the previous tx to get the input amount
          }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Total output: ${totalOutput.toFixed(8)} VRSC`);
        console.log(
          `   joanna@ found in block: ${joannaFound ? '✅ YES' : '❌ NO'}`
        );

        // Calculate what our script would record
        console.log(`\n🤖 What our script would record:`);
        for (let i = 0; i < coinstake.vout.length; i++) {
          const vout = coinstake.vout[i];
          const addresses = vout.scriptPubKey?.addresses || [];
          if (addresses.includes(JOANNA_IADDR)) {
            console.log(
              `   ✅ Would record: ${vout.value.toFixed(8)} VRSC from vout[${i}]`
            );
            console.log(`   ⚠️  IS THIS THE CORRECT REWARD AMOUNT?`);
            break; // Our script stops at first match
          }
        }
      } else {
        console.log('❌ Not a PoS block - skipping');
      }
    } catch (error) {
      console.error(`Error analyzing block ${height}: ${error.message}`);
    }
  }

  console.log('\n\n╔═══════════════════════════════════════════════╗');
  console.log('║              ANALYSIS QUESTIONS              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  console.log('❓ Key Questions to Answer:\n');
  console.log('1. In a coinstake transaction, which vout contains the REWARD?');
  console.log('   - Is it the FIRST vout with the I-address?');
  console.log('   - Or do we need to calculate: total_output - total_input?\n');

  console.log('2. Are there multiple vouts with the same I-address?');
  console.log('   - If yes, which one represents the staking reward?\n');

  console.log('3. Does the vout value include:');
  console.log('   - ONLY the staking reward?');
  console.log('   - OR the original staked amount + reward?\n');

  console.log('4. Should we be looking at a specific vout index?');
  console.log('   - e.g., always vout[0] or vout[1]?\n');

  console.log('💡 Next Steps:');
  console.log('   - Compare results above with known reward amounts');
  console.log('   - Check Verus documentation for coinstake structure');
  console.log('   - Verify with block explorer data\n');
}

verifyStakeDetection().catch(console.error);
