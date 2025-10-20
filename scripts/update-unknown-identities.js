#!/usr/bin/env node
/**
 * Update "unknown" VerusIDs with their actual names from the blockchain
 * 
 * This script:
 * 1. Finds all identities with base_name = 'unknown'
 * 2. Looks up their actual names via RPC
 * 3. Updates the database with the correct names
 */

const { Pool } = require('pg');
const http = require('http');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';
const RPC_HOST = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASSWORD = process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

// Database connection
const pool = new Pool({ connectionString: DATABASE_URL });

// RPC call helper
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

// Get identity details from blockchain
async function getIdentityDetails(iAddress) {
  try {
    const result = await rpcCall('getidentity', [iAddress]);
    if (result && result.identity) {
      return {
        name: result.identity.name || 'unknown',
        friendlyName: result.fullyqualifiedname || `${result.identity.name || 'unknown'}.VRSC@`,
      };
    }
    return null;
  } catch (error) {
    // If identity not found or error, return null
    return null;
  }
}

// Update identity in database
async function updateIdentity(iAddress, name, friendlyName) {
  const query = `
    UPDATE identities 
    SET base_name = $2, friendly_name = $3, last_refreshed_at = NOW()
    WHERE identity_address = $1
  `;
  await pool.query(query, [iAddress, name, friendlyName]);
}

// Main function
async function main() {
  console.log('🔍 Finding identities with unknown names...\n');
  
  // Get all unknown identities
  const result = await pool.query(
    "SELECT identity_address FROM identities WHERE base_name = 'unknown' ORDER BY identity_address"
  );
  
  const unknownIdentities = result.rows;
  const total = unknownIdentities.length;
  
  console.log(`Found ${total} unknown identities\n`);
  
  if (total === 0) {
    console.log('✅ All identities already have names!');
    process.exit(0);
  }
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  console.log('📡 Fetching identity details from blockchain...\n');
  
  for (let i = 0; i < unknownIdentities.length; i++) {
    const { identity_address } = unknownIdentities[i];
    const progress = ((i + 1) / total * 100).toFixed(1);
    
    process.stdout.write(`\r[${progress}%] Processing ${i + 1}/${total}... `);
    
    try {
      const details = await getIdentityDetails(identity_address);
      
      if (details && details.name !== 'unknown') {
        await updateIdentity(identity_address, details.name, details.friendlyName);
        updated++;
        process.stdout.write(`✅ ${details.name}`);
      } else {
        notFound++;
        process.stdout.write(`❌ Not found`);
      }
    } catch (error) {
      errors++;
      process.stdout.write(`⚠️  Error`);
    }
    
    // Add a small delay to avoid overwhelming the RPC
    if (i < unknownIdentities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('\n\n📊 Results:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(`   ⚠️  Errors: ${errors}`);
  console.log(`   📈 Total processed: ${total}`);
  
  console.log('\n✨ Done!');
}

// Run the script
main()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    pool.end();
    process.exit(1);
  });

