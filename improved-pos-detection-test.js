#!/usr/bin/env node

const { execSync } = require('child_process');

async function testImprovedPoSDetection() {
  console.log('🧪 TESTING IMPROVED PoS DETECTION LOGIC');
  console.log('=======================================');

  // Test various blocks to understand PoS detection better
  const testBlocks = [
    1059996, // Known PoS block with VerusID
    1299334, // December 2020 PoS with VerusID
    3780005, // Recent PoS with VerusID
    3780004, // Recent PoS without VerusID
    3780000, // Recent PoW block
  ];

  for (const blockHeight of testBlocks) {
    console.log(`\n🔍 Testing block ${blockHeight}:`);

    try {
      const hash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${hash} 2`,
        { encoding: 'utf8' }
      );
      const block = JSON.parse(blockData);

      console.log(`   Hash: ${block.hash}`);
      console.log(`   Height: ${block.height}`);
      console.log(`   Time: ${new Date(block.time * 1000)}`);

      // Test ALL possible PoS detection methods
      const detectionMethods = {
        validationtype: block.validationtype,
        blocktype: block.blocktype,
        posrewarddest: block.posrewarddest,
        proofofstake: block.proofofstake,
        postarget: block.postarget,
        poshashbh: block.poshashbh,
        poshashtx: block.poshashtx,
        possourcetxid: block.possourcetxid,
        possourcevoutnum: block.possourcevoutnum,
        postxddest: block.postxddest,
      };

      console.log('   PoS Detection Methods:');
      for (const [method, value] of Object.entries(detectionMethods)) {
        if (value !== undefined && value !== null) {
          console.log(`     ${method}: ${value}`);
        }
      }

      // Current detection logic
      const currentDetection =
        block.validationtype === 'stake' ||
        block.posrewarddest !== undefined ||
        block.proofofstake !== undefined ||
        block.blocktype === 'minted';

      console.log(`   Current Detection: ${currentDetection}`);

      // Improved detection logic
      const improvedDetection =
        block.validationtype === 'stake' ||
        block.blocktype === 'minted' ||
        block.posrewarddest !== undefined ||
        block.proofofstake !== undefined ||
        block.postarget !== undefined ||
        block.poshashbh !== undefined ||
        block.poshashtx !== undefined ||
        block.possourcetxid !== undefined;

      console.log(`   Improved Detection: ${improvedDetection}`);

      // Check if it's actually a PoS block by looking at transaction structure
      if (block.tx && block.tx.length > 0) {
        const firstTx = block.tx[0];
        console.log(`   First TX: ${firstTx.txid}`);
        console.log(
          `   First TX has vin: ${firstTx.vin ? firstTx.vin.length : 0} inputs`
        );
        console.log(
          `   First TX has vout: ${firstTx.vout ? firstTx.vout.length : 0} outputs`
        );

        // Check if first transaction has coinbase (PoW) or coinstake (PoS)
        if (firstTx.vin && firstTx.vin.length > 0) {
          const firstInput = firstTx.vin[0];
          if (firstInput.coinbase) {
            console.log(`   First input: COINBASE (PoW block)`);
          } else if (firstInput.txid && firstInput.vout !== undefined) {
            console.log(`   First input: COINSTAKE (PoS block)`);
          }
        }
      }

      // Check for VerusID addresses
      if (block.tx && block.tx.length > 0) {
        const coinstake = block.tx[0];
        if (coinstake.vout) {
          let hasVerusID = false;
          for (const output of coinstake.vout) {
            if (output.scriptPubKey && output.scriptPubKey.addresses) {
              for (const address of output.scriptPubKey.addresses) {
                if (address && address.startsWith('i') && address.length > 20) {
                  hasVerusID = true;
                  console.log(`   ✅ Found VerusID: ${address}`);
                }
              }
            }
          }
          if (!hasVerusID) {
            console.log(`   ❌ No VerusID addresses found`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

testImprovedPoSDetection();
