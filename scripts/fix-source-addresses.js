#!/usr/bin/env node

/**
 * Fix Source Addresses in Existing Stakes
 * Re-checks all stakes where source_address = identity_address
 * to verify they're actually direct I-address stakes
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

let stats = {
  checked: 0,
  corrected: 0,
  stillDirect: 0,
  nowDelegated: 0,
  nulled: 0,
  errors: 0
};

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'fix-source',
    method,
    params,
  });

  const url = new URL(RPC_URL);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      Authorization: `Basic ${auth}`,
    },
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    protocol: url.protocol,
    agent:
      url.protocol === 'https:'
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
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

async function getCorrectSourceAddress(txid, identityAddress) {
  try {
    const tx = await rpcCall('getrawtransaction', [txid, true]);

    if (!tx || !tx.vin || tx.vin.length === 0) {
      return null;
    }

    // Check if coinbase (PoW block)
    if (tx.vin[0] && tx.vin[0].coinbase) {
      return null; // PoW block, not PoS
    }

    // Get the address from the first vin (staking UTXO owner)
    for (const vin of tx.vin) {
      if (vin.txid && vin.vout !== undefined) {
        try {
          const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
          if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
            const prevVout = prevTx.vout[vin.vout];
            if (prevVout.scriptPubKey && prevVout.scriptPubKey.addresses) {
              const addresses = prevVout.scriptPubKey.addresses;
              if (addresses.length > 0) {
                return addresses[0]; // Return the UTXO owner
              }
            }
          }
        } catch (err) {
          continue;
        }
      }
    }

    return null; // Could not determine
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Fix Source Addresses - Verify I-Address Stakes        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Get all stakes where source_address = identity_address (marked as "direct")
    // These need to be verified
    const result = await pool.query(`
      SELECT id, txid, identity_address, source_address, block_height
      FROM staking_rewards
      WHERE source_address = identity_address
      AND block_time >= NOW() - INTERVAL '90 days'
      ORDER BY block_time DESC
      LIMIT 1000
    `);

    console.log(`📊 Found ${result.rows.length} stakes to verify\n`);

    for (const row of result.rows) {
      stats.checked++;

      const correctSource = await getCorrectSourceAddress(row.txid, row.identity_address);

      if (correctSource && correctSource !== row.source_address) {
        // Source was wrong! Update it
        await pool.query(
          'UPDATE staking_rewards SET source_address = $1 WHERE id = $2',
          [correctSource, row.id]
        );

        if (correctSource === row.identity_address) {
          stats.stillDirect++;
          console.log(`✅ ${row.identity_address.slice(0,20)}... - Still direct`);
        } else {
          stats.nowDelegated++;
          stats.corrected++;
          console.log(`📝 ${row.identity_address.slice(0,20)}... - Corrected to ${correctSource.slice(0,20)}...`);
        }
      } else if (correctSource === null && row.source_address !== null) {
        // Could not determine - set to null
        await pool.query(
          'UPDATE staking_rewards SET source_address = NULL WHERE id = $1',
          [row.id]
        );
        stats.nulled++;
        stats.corrected++;
        console.log(`⚠️  ${row.identity_address.slice(0,20)}... - Set to NULL (unknown)`);
      }

      if (stats.checked % 100 === 0) {
        console.log(`\nProgress: ${stats.checked}/${result.rows.length} (${stats.corrected} corrected)\n`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS:');
    console.log(`  Total checked: ${stats.checked}`);
    console.log(`  Corrected: ${stats.corrected}`);
    console.log(`  Still direct I-address: ${stats.stillDirect}`);
    console.log(`  Changed to delegated: ${stats.nowDelegated}`);
    console.log(`  Set to NULL (unknown): ${stats.nulled}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log('='.repeat(60) + '\n');

    // Show which VerusIDs should now be excluded from browse
    const excluded = await pool.query(`
      SELECT 
        i.base_name,
        COUNT(*) FILTER (WHERE sr.source_address != sr.identity_address OR sr.source_address IS NULL) as delegated_stakes,
        COUNT(*) FILTER (WHERE sr.source_address = sr.identity_address) as direct_stakes
      FROM identities i
      JOIN staking_rewards sr ON i.identity_address = sr.identity_address
      WHERE sr.block_time >= NOW() - INTERVAL '30 days'
      GROUP BY i.base_name, i.identity_address
      HAVING COUNT(*) FILTER (WHERE sr.source_address != sr.identity_address OR sr.source_address IS NULL) > 
             COUNT(*) FILTER (WHERE sr.source_address = sr.identity_address)
      ORDER BY delegated_stakes DESC
      LIMIT 10
    `);

    if (excluded.rows.length > 0) {
      console.log('VerusIDs that will be EXCLUDED from browse (mostly delegated):');
      excluded.rows.forEach(row => {
        console.log(`  - ${row.base_name}: ${row.delegated_stakes} delegated, ${row.direct_stakes} direct`);
      });
    }

    console.log('\n✅ Source address correction complete!');
    console.log('🔄 Restart your app to see updated browse list\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

