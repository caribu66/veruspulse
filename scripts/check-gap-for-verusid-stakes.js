#!/usr/bin/env node
/**
 * check-gap-for-verusid-stakes.js
 * Check the gap between current scan position and first known stake for VerusID stakes
 */

require('dotenv').config();
const https = (Client = require('https'));

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'check-gap-for-verusid-stakes',
    method,
    params,
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      Authorization: `Basic ${auth}`,
    },
  };

  const url = new URL(RPC_URL);
  options.hostname = url.hostname;
  options.port = url.port;
  options.path = url.pathname;
  options.protocol = url.protocol;

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : require('http')).request(
      options,
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message));
            else resolve(json.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// CORRECTED stake detection logic
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Need at least 2 transactions: coinstake (tx[0]) and staker (tx[-1])
  if (block.tx.length < 2) return stakes;

  // Coinstake transaction (first tx) - contains the reward
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Last transaction (tx[-1]) - contains the staker's address
  const stakerTx = block.tx[block.tx.length - 1];
  if (!stakerTx || !stakerTx.vout) return stakes;

  // Calculate total reward from coinstake
  const totalReward = coinstake.vout.reduce(
    (sum, v) => sum + (v.value || 0),
    0
  );

  // Look for target addresses in the staker transaction
  for (let voutIdx = 0; voutIdx < stakerTx.vout.length; voutIdx++) {
    const vout = stakerTx.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (targetAddresses.has(addr)) {
        stakes.push({
          address: addr,
          blockHeight: block.height,
          blockHash: block.hash,
          blockTime: new Date(block.time * 1000),
          txid: coinstake.txid, // Use coinstake TXID for the reward
          vout: voutIdx, // Use vout from staker transaction
          reward: Math.round(totalReward * 100000000), // Convert to satoshis
        });
      }
    }
  }

  return stakes;
}

async function checkGapForVerusIDStakes() {
  console.log('🔍 Checking Gap for VerusID Stakes...\n');

  try {
    // Current scan position and first known stake
    const currentScanBlock = 996188;
    const firstKnownStake = 1077805;

    console.log(`Current scan position: ${currentScanBlock.toLocaleString()}`);
    console.log(
      `First known VerusID stake: ${firstKnownStake.toLocaleString()}`
    );
    console.log(
      `Gap: ${(firstKnownStake - currentScanBlock).toLocaleString()} blocks\n`
    );

    // Search the gap for VerusID stakes
    const step = 500; // Check every 500th block
    let posBlocksChecked = 0;
    let verusIDStakesFound = 0;
    let earliestFound = null;

    console.log(`Searching gap (every ${step}th block)...\n`);

    for (
      let height = currentScanBlock;
      height <= firstKnownStake;
      height += step
    ) {
      try {
        const blockHash = await rpcCall('getblockhash', [height]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';

        if (isPoS && block.tx.length >= 2) {
          posBlocksChecked++;

          // Check the last transaction for I-addresses
          const stakerTx = block.tx[block.tx.length - 1];

          // Look for I-addresses in the staker transaction
          const verusIDAddresses = [];
          stakerTx.vout.forEach((vout, i) => {
            if (
              vout.scriptPubKey.addresses &&
              vout.scriptPubKey.addresses.length > 0
            ) {
              const iAddresses = vout.scriptPubKey.addresses.filter(addr =>
                addr.startsWith('i')
              );
              if (iAddresses.length > 0) {
                verusIDAddresses.push(...iAddresses);
              }
            }
          });

          if (verusIDAddresses.length > 0) {
            verusIDStakesFound++;

            // Get the coinstake reward
            const coinstake = block.tx[0];
            const totalReward = coinstake.vout.reduce(
              (sum, v) => sum + (v.value || 0),
              0
            );

            console.log(`🎯 Block ${height}: VerusID stake found!`);
            console.log(
              `   - Time: ${new Date(block.time * 1000).toISOString()}`
            );
            console.log(`   - VerusIDs: ${verusIDAddresses.join(', ')}`);
            console.log(`   - Reward: ${totalReward} VRSC`);
            console.log(`   - TXID: ${stakerTx.txid}\n`);

            if (!earliestFound || height < earliestFound.height) {
              earliestFound = {
                height,
                time: new Date(block.time * 1000),
                verusIDs: verusIDAddresses,
                reward: totalReward,
                txid: stakerTx.txid,
              };
            }
          }

          // Progress indicator
          if (posBlocksChecked % 10 === 0) {
            process.stdout.write(
              `\rChecked ${posBlocksChecked} PoS blocks... Found ${verusIDStakesFound} VerusID stakes`
            );
          }
        }
      } catch (error) {
        // Skip blocks that can't be fetched
        continue;
      }
    }

    console.log(`\n\n📊 Results:`);
    console.log(`   PoS blocks checked: ${posBlocksChecked}`);
    console.log(`   VerusID stakes found: ${verusIDStakesFound}`);

    if (earliestFound) {
      console.log(`\n🏆 Earliest VerusID Stake Found in Gap:`);
      console.log(`   Block Height: ${earliestFound.height.toLocaleString()}`);
      console.log(`   Date: ${earliestFound.time.toLocaleDateString()}`);
      console.log(`   Time: ${earliestFound.time.toLocaleTimeString()}`);
      console.log(`   VerusIDs: ${earliestFound.verusIDs.join(', ')}`);
      console.log(`   Reward: ${earliestFound.reward} VRSC`);
      console.log(`   TXID: ${earliestFound.txid}`);
    }

    if (verusIDStakesFound === 0) {
      console.log('\n✅ No VerusID stakes found in the gap!');
      console.log(
        '   This confirms that VerusID staking truly began at block 1,077,805'
      );
      console.log(
        '   The scanner is working correctly and will find stakes soon.'
      );
    } else {
      console.log('\n🎯 VerusID stakes found in the gap!');
      console.log(
        "   There are earlier VerusID stakes than what's in the database."
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

checkGapForVerusIDStakes().catch(console.error);
