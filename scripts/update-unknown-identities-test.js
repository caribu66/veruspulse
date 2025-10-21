#!/usr/bin/env node
/**
 * TEST VERSION: Update only 10 "unknown" VerusIDs
 * Safe to run - only updates 10 identities for testing
 */

const { Pool } = require('pg');
const http = require('http');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';
const RPC_HOST = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASSWORD =
  process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

const pool = new Pool({ connectionString: DATABASE_URL });

async function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(RPC_HOST);
    const auth = Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64');

    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 18843,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Basic ${auth}`,
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getIdentityDetails(iAddress) {
  try {
    const result = await rpcCall('getidentity', [iAddress]);
    if (result && result.identity) {
      return {
        name: result.identity.name || 'unknown',
        friendlyName:
          result.fullyqualifiedname ||
          `${result.identity.name || 'unknown'}.VRSC@`,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function updateIdentity(iAddress, name, friendlyName) {
  const query = `
    UPDATE identities 
    SET base_name = $2, friendly_name = $3, last_refreshed_at = NOW()
    WHERE identity_address = $1
  `;
  await pool.query(query, [iAddress, name, friendlyName]);
}

async function main() {
  console.log('🧪 TEST MODE: Updating only 10 unknown identities\n');

  // Get only 10 unknown identities for testing
  const result = await pool.query(
    "SELECT identity_address FROM identities WHERE base_name = 'unknown' ORDER BY identity_address LIMIT 10"
  );

  const unknownIdentities = result.rows;
  const total = unknownIdentities.length;

  console.log(`Found ${total} unknown identities to test\n`);

  if (total === 0) {
    console.log('✅ No unknown identities found!');
    pool.end();
    process.exit(0);
  }

  let updated = 0;
  let notFound = 0;

  console.log('📡 Fetching identity details from blockchain...\n');

  for (let i = 0; i < unknownIdentities.length; i++) {
    const { identity_address } = unknownIdentities[i];

    try {
      const details = await getIdentityDetails(identity_address);

      if (details && details.name !== 'unknown') {
        await updateIdentity(
          identity_address,
          details.name,
          details.friendlyName
        );
        console.log(`${i + 1}. ✅ ${identity_address} → ${details.name}`);
        updated++;
      } else {
        console.log(`${i + 1}. ❌ ${identity_address} → Not found`);
        notFound++;
      }
    } catch (error) {
      console.log(
        `${i + 1}. ⚠️  ${identity_address} → Error: ${error.message}`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Test Results:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log('\n✨ Test complete!');

  pool.end();
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  pool.end();
  process.exit(1);
});
