#!/usr/bin/env node
/**
 * find-pos-blocks.js
 * Find actual PoS blocks around the current scan area
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
    id: 'find-pos-blocks',
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

async function findPoSBlocks() {
  console.log('🔍 Finding PoS blocks around current scan area...\n');

  try {
    const currentHeight = await rpcCall('getblockchaininfo');
    console.log(`Current blockchain height: ${currentHeight.blocks}\n`);

    // Search around the current scan area (967,197)
    const scanArea = 967200;
    console.log(`Searching around block ${scanArea} for PoS blocks...\n`);

    let posBlocksFound = 0;
    let totalBlocksChecked = 0;

    // Check a range around the scan area
    const startHeight = scanArea - 1000;
    const endHeight = scanArea + 1000;

    console.log(`Checking blocks ${startHeight} to ${endHeight}...\n`);

    for (let height = startHeight; height <= endHeight; height += 10) {
      totalBlocksChecked++;

      try {
        const blockHash = await rpcCall('getblockhash', [height]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';

        if (isPoS) {
          posBlocksFound++;
          console.log(`✅ PoS Block ${height}:`);
          console.log(`   - Validation type: ${block.validationtype}`);
          console.log(`   - Block type: ${block.blocktype}`);
          console.log(
            `   - Time: ${new Date(block.time * 1000).toISOString()}`
          );
          console.log(`   - TX count: ${block.tx ? block.tx.length : 0}`);

          if (block.tx && block.tx.length > 0) {
            const coinstake = block.tx[0];
            console.log(`   - Coinstake TXID: ${coinstake.txid}`);
            if (coinstake.vout) {
              console.log(`   - Coinstake vouts: ${coinstake.vout.length}`);
              coinstake.vout.forEach((vout, i) => {
                const addresses = vout.scriptPubKey?.addresses || [];
                console.log(
                  `     vout[${i}]: ${vout.value || 0} VRSC -> ${addresses.join(', ')}`
                );
              });
            }
          }
          console.log('');
        }

        // Progress indicator
        if (height % 100 === 0) {
          process.stdout.write(
            `\rChecked ${height - startHeight + 1}/${endHeight - startHeight + 1} blocks... Found ${posBlocksFound} PoS blocks`
          );
        }
      } catch (error) {
        // Skip blocks that can't be fetched
        continue;
      }
    }

    console.log(`\n\n📊 Results:`);
    console.log(`   Total blocks checked: ${totalBlocksChecked}`);
    console.log(`   PoS blocks found: ${posBlocksFound}`);
    console.log(
      `   PoS block ratio: ${((posBlocksFound / totalBlocksChecked) * 100).toFixed(2)}%`
    );

    if (posBlocksFound === 0) {
      console.log('\n❌ No PoS blocks found in this range!');
      console.log('   This explains why no stakes are being detected.');
      console.log(
        '   Verus might have different PoS activation or block patterns.'
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

findPoSBlocks().catch(console.error);
