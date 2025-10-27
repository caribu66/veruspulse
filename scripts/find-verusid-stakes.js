#!/usr/bin/env node
/**
 * find-verusid-stakes.js
 * Find actual VerusID stakes in PoS blocks
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
    id: 'find-verusid-stakes',
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

async function findVerusIDStakes() {
  console.log('🔍 Finding VerusID stakes in PoS blocks...\n');

  try {
    // Search through a range of PoS blocks to find VerusID stakes
    const startHeight = 1000000; // Start from block 1M
    const endHeight = 1100000; // Search 100K blocks
    const step = 50; // Check every 50th block for efficiency

    let posBlocksChecked = 0;
    let verusIDStakesFound = 0;

    console.log(
      `Searching blocks ${startHeight} to ${endHeight} (every ${step}th block)...\n`
    );

    for (let height = startHeight; height <= endHeight; height += step) {
      try {
        const blockHash = await rpcCall('getblockhash', [height]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';

        if (isPoS) {
          posBlocksChecked++;

          // Check the last transaction for VerusID addresses
          if (block.tx.length > 1) {
            const lastTx = block.tx[block.tx.length - 1];

            // Look for I-addresses in the last transaction
            const verusIDAddresses = [];
            lastTx.vout.forEach((vout, i) => {
              if (
                vout.scriptPubKey.addresses &&
                vout.scriptPubKey.addresses.length > 0
              ) {
                const iAddresses = vout.scriptPubKey.addresses.filter(addr =>
                  addr.startsWith('i')
                );
                if (iAddresses.length > 0) {
                  verusIDAddresses.push(...iAddresses);
                  console.log(`🎯 Block ${height}: VerusID stake found!`);
                  console.log(`   - TXID: ${lastTx.txid}`);
                  console.log(
                    `   - vout[${i}]: ${vout.value} VRSC -> ${iAddresses.join(', ')}`
                  );

                  // Get the coinstake reward
                  const coinstake = block.tx[0];
                  const totalReward = coinstake.vout.reduce(
                    (sum, v) => sum + (v.value || 0),
                    0
                  );
                  console.log(`   - Coinstake reward: ${totalReward} VRSC`);
                  console.log(
                    `   - Time: ${new Date(block.time * 1000).toISOString()}\n`
                  );

                  verusIDStakesFound++;
                }
              }
            });
          }

          // Progress indicator
          if (posBlocksChecked % 50 === 0) {
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

    if (verusIDStakesFound === 0) {
      console.log('\n❌ No VerusID stakes found in this range!');
      console.log('   This could mean:');
      console.log("   1. VerusIDs weren't staking in this period");
      console.log('   2. VerusID stakes happen in different blocks');
      console.log('   3. The stake detection logic needs adjustment');
    } else {
      console.log(
        '\n✅ VerusID stakes found! The detection logic should work.'
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

findVerusIDStakes().catch(console.error);
