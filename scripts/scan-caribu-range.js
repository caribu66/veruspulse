#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

const BATCH_SIZE = 200;
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

async function rpcCall(method, params = []) {
  const auth = Buffer.from(RPC_USER + ':' + RPC_PASS).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'scan',
    method,
    params,
  });
  const url = new URL(RPC_URL);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      Authorization: 'Basic ' + auth,
    },
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
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
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function scanCaribou() {
  const caribuAddr = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
  const startHeight = 987861; // Caribu creation
  const endHeight = 3648690; // Current tip

  console.log(
    `Scanning Caribu66@ range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}\n`
  );

  let stakes = [];
  let blocksScanned = 0;
  let posBlocks = 0;
  const totalBlocks = endHeight - startHeight;
  const startTime = Date.now();

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batch = [];
    for (
      let h = height;
      h <= Math.min(height + BATCH_SIZE - 1, endHeight);
      h++
    ) {
      batch.push(h);
    }

    const blocks = await Promise.all(
      batch.map(async h => {
        try {
          const hash = await rpcCall('getblockhash', [h]);
          return await rpcCall('getblock', [hash, 2]);
        } catch (e) {
          return null;
        }
      })
    );

    for (const block of blocks) {
      if (!block) continue;
      blocksScanned++;

      const isPoS =
        block.validationtype === 'stake' || block.blocktype === 'minted';
      if (!isPoS) continue;

      posBlocks++;

      const coinstake = block.tx[0];
      if (!coinstake?.vout?.[0]?.scriptPubKey?.addresses) continue;

      if (coinstake.vout[0].scriptPubKey.addresses.includes(caribuAddr)) {
        const reward = coinstake.vout.reduce(
          (sum, v) => sum + (v.value || 0),
          0
        );
        stakes.push({
          height: block.height,
          hash: block.hash,
          time: new Date(block.time * 1000),
          txid: coinstake.txid,
          reward: Math.round(reward * 100000000),
        });
      }
    }

    if (blocksScanned % 1000 === 0) {
      const progress = ((blocksScanned / totalBlocks) * 100).toFixed(2);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = blocksScanned / elapsed;
      const eta = Math.round((totalBlocks - blocksScanned) / rate / 60);
      console.log(
        `Progress: ${progress}% | Blocks: ${blocksScanned.toLocaleString()} | PoS: ${posBlocks.toLocaleString()} | Stakes: ${stakes.length} | ETA: ${eta}m`
      );
    }
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`Stakes found: ${stakes.length}`);
  console.log(`Expected: 1,143\n`);

  await pool.end();
}

scanCaribou();
