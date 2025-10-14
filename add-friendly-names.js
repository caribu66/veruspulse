// Script to add friendly names to verusid_statistics
const { Pool } = require('pg');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

const db = new Pool({ 
  connectionString: dbUrl, 
  max: 5,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000
});

// RPC helper
async function verusdRpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const rpcUser = process.env.VERUS_RPC_USER || 'verus';
    const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
    const rpcHost = '127.0.0.1';
    const rpcPort = 18843;
    
    const postData = JSON.stringify({ jsonrpc: '1.0', id: '1', method, params });
    
    const options = {
      hostname: rpcHost,
      port: rpcPort,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Basic ' + Buffer.from(`${rpcUser}:${rpcPass}`).toString('base64'),
      },
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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

async function resolveFriendlyName(iAddress) {
  try {
    const identity = await verusdRpc('getidentity', [iAddress]);
    if (identity && identity.identity && identity.identity.name) {
      const baseName = identity.identity.name;
      const friendlyName = identity.friendlyname || `${baseName}.VRSC@`;
      return { baseName, friendlyName };
    }
  } catch (error) {
    console.log(`   ⚠️  Could not resolve ${iAddress}: ${error.message}`);
  }
  return null;
}

async function main() {
  try {
    console.log('🔍 Finding I-addresses without friendly names...\n');
    
    const result = await db.query(`
      SELECT address FROM verusid_statistics 
      WHERE friendly_name IS NULL OR friendly_name = ''
    `);
    
    console.log(`Found ${result.rows.length} addresses to resolve\n`);
    
    for (const row of result.rows) {
      const iAddress = row.address;
      console.log(`Resolving ${iAddress}...`);
      
      const names = await resolveFriendlyName(iAddress);
      
      if (names) {
        await db.query(
          `UPDATE verusid_statistics 
           SET friendly_name = $1 
           WHERE address = $2`,
          [names.friendlyName, iAddress]
        );
        console.log(`   ✅ Set to: ${names.friendlyName}\n`);
      } else {
        console.log(`   ⚠️  Could not resolve, keeping as I-address\n`);
      }
      
      // Small delay to avoid overwhelming daemon
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Done! Checking results...\n');
    
    const finalResult = await db.query(`
      SELECT address, friendly_name, total_stakes, total_rewards_satoshis/100000000.0 as vrsc
      FROM verusid_statistics
      ORDER BY total_rewards_satoshis DESC
    `);
    
    console.log('Updated statistics:');
    finalResult.rows.forEach(row => {
      console.log(`   ${row.friendly_name || row.address}: ${row.total_stakes} stakes, ${parseFloat(row.vrsc).toFixed(2)} VRSC`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

main();

