#!/usr/bin/env node
/**
 * investigate-early-verusid-stakes.js
 * Investigate if there were VerusID stakes before block 1,077,805
 */

require('dotenv').config();
const https = require('https');

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'investigate-early-verusid-stakes',
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

async function investigateEarlyVerusIDStakes() {
  console.log('🔍 Investigating Early VerusID Stakes...\n');

  try {
    // Search from VerusID activation (800,200) to first known stake (1,077,805)
    const startHeight = 800200;
    const endHeight = 1077805;
    const step = 1000; // Check every 1000th block for efficiency

    console.log(
      `Searching blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()} (every ${step}th block)...\n`
    );

    let posBlocksChecked = 0;
    let verusIDStakesFound = 0;
    let earliestVerusIDStake = null;

    for (let height = startHeight; height <= endHeight; height += step) {
      try {
        const blockHash = await rpcCall('getblockhash', [height]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';

        if (isPoS && block.tx.length >= 2) {
          posBlocksChecked++;

          // Check the last transaction for I-addresses (VerusIDs)
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

            if (!earliestVerusIDStake || height < earliestVerusIDStake.height) {
              earliestVerusIDStake = {
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

    if (earliestVerusIDStake) {
      console.log(`\n🏆 Earliest VerusID Stake Found:`);
      console.log(
        `   Block Height: ${earliestVerusIDStake.height.toLocaleString()}`
      );
      console.log(`   Date: ${earliestVerusIDStake.time.toLocaleDateString()}`);
      console.log(`   Time: ${earliestVerusIDStake.time.toLocaleTimeString()}`);
      console.log(`   VerusIDs: ${earliestVerusIDStake.verusIDs.join(', ')}`);
      console.log(`   Reward: ${earliestVerusIDStake.reward} VRSC`);
      console.log(`   TXID: ${earliestVerusIDStake.txid}`);
    }

    if (verusIDStakesFound === 0) {
      console.log('\n❌ No VerusID stakes found in this range!');
      console.log(
        '   This confirms that VerusID staking began around block 1,077,805'
      );
    } else {
      console.log('\n✅ VerusID stakes found before block 1,077,805!');
      console.log('   The timeline needs to be corrected.');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

investigateEarlyVerusIDStakes().catch(console.error);
