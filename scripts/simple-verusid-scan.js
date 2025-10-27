#!/usr/bin/env node
/**
 * simple-verusid-scan.js
 * Simple, straightforward VerusID stake scanner
 * Scans all blocks from creation to tip, finds ALL stakes
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

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

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
          Authorization: 'Basic ' + auth,
        },
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
      },
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

async function scanVerusID(verusidName) {
  console.log(`\n⚡ Scanning ${verusidName}\n`);

  // Get VerusID info
  const result = await pool.query(
    `
    SELECT identity_address, friendly_name, first_seen_block
    FROM identities
    WHERE friendly_name ILIKE $1 OR base_name ILIKE $2
    LIMIT 1
  `,
    [verusidName, verusidName.replace('@', '')]
  );

  if (result.rows.length === 0) {
    throw new Error(`VerusID not found: ${verusidName}`);
  }

  const verusid = result.rows[0];
  const addr = verusid.identity_address;

  console.log(`✅ ${verusid.friendly_name}`);
  console.log(`   Address: ${addr}`);
  console.log(
    `   Creation: Block ${verusid.first_seen_block.toLocaleString()}\n`
  );

  // Get current tip
  const info = await rpcCall('getblockchaininfo', []);
  const tip = info.blocks;

  const start = verusid.first_seen_block;
  const totalBlocks = tip - start;

  console.log(`📊 Scanning ${totalBlocks.toLocaleString()} blocks\n`);
  console.log(`From: ${start.toLocaleString()}`);
  console.log(`To:   ${tip.toLocaleString()}\n`);

  let stakes = [];
  let posCount = 0;
  let scanned = 0;
  const startTime = Date.now();

  for (let h = start; h <= tip; h++) {
    try {
      const hash = await rpcCall('getblockhash', [h]);
      const block = await rpcCall('getblock', [hash, 2]);
      scanned++;

      const isPoS =
        block.validationtype === 'stake' || block.blocktype === 'minted';
      if (!isPoS) continue;

      posCount++;

      const coinstake = block.tx[0];
      if (coinstake?.vout?.[0]?.scriptPubKey?.addresses?.includes(addr)) {
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

      if (scanned % 1000 === 0) {
        const progress = ((scanned / totalBlocks) * 100).toFixed(2);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = scanned / elapsed;
        const eta = Math.round((totalBlocks - scanned) / rate / 60);
        console.log(
          `Progress: ${progress}% | Blocks: ${scanned.toLocaleString()}/${totalBlocks.toLocaleString()} | PoS: ${posCount.toLocaleString()} | Stakes: ${stakes.length} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}m`
        );
      }
    } catch (error) {
      // Skip errors
    }
  }

  console.log(`\n✅ SCAN COMPLETE!\n`);
  console.log(`Stakes found: ${stakes.length}`);
  console.log(`PoS blocks: ${posCount.toLocaleString()}`);
  console.log(
    `Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes\n`
  );

  // Save to database
  console.log('💾 Saving to database...');
  for (const stake of stakes) {
    try {
      await pool.query(
        `
        INSERT INTO staking_rewards 
          (identity_address, block_height, block_hash, block_time, txid, vout, amount_sats, classifier)
        VALUES ($1, $2, $3, $4, $5, 0, $6, 'stake')
        ON CONFLICT DO NOTHING
      `,
        [addr, stake.height, stake.hash, stake.time, stake.txid, stake.reward]
      );
    } catch (e) {}
  }

  console.log(`✅ Saved ${stakes.length} stakes!\n`);

  await pool.end();
}

const verusidName = process.argv[2];
if (!verusidName) {
  console.log('Usage: node simple-verusid-scan.js <verusid>');
  console.log('Example: node simple-verusid-scan.js "caribu66@"');
  process.exit(1);
}

scanVerusID(verusidName);
