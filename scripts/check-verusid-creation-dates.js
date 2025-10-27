#!/usr/bin/env node
/**
 * check-verusid-creation-dates.js
 * Check when specific VerusIDs were created by converting block heights to dates
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
};
const pool = new Pool(dbConfig);

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'check-verusid-creation-dates',
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

async function checkVerusIDCreationDates() {
  console.log('🔍 Checking VerusID Creation Dates...\n');

  try {
    // Get VerusIDs with creation block information
    const result = await pool.query(`
      SELECT identity_address, base_name, friendly_name, first_seen_block
      FROM identities 
      WHERE identity_address LIKE 'i%' 
        AND first_seen_block IS NOT NULL 
      ORDER BY first_seen_block 
      LIMIT 20
    `);

    console.log('📋 VerusID Creation Timeline:');
    console.log('============================\n');

    for (const verusID of result.rows) {
      try {
        // Get block information to convert height to date
        const blockHash = await rpcCall('getblockhash', [
          verusID.first_seen_block,
        ]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const creationDate = new Date(block.time * 1000);

        console.log(`${verusID.friendly_name || verusID.base_name}:`);
        console.log(`  - Address: ${verusID.identity_address}`);
        console.log(
          `  - Creation Block: ${verusID.first_seen_block.toLocaleString()}`
        );
        console.log(`  - Creation Date: ${creationDate.toLocaleDateString()}`);
        console.log(`  - Creation Time: ${creationDate.toLocaleTimeString()}`);
        console.log(`  - Block Hash: ${block.hash}`);
        console.log('');
      } catch (error) {
        console.log(`${verusID.friendly_name || verusID.base_name}:`);
        console.log(`  - Address: ${verusID.identity_address}`);
        console.log(
          `  - Creation Block: ${verusID.first_seen_block.toLocaleString()}`
        );
        console.log(`  - Error getting block info: ${error.message}`);
        console.log('');
      }
    }

    // Check specific VerusIDs mentioned in conversation
    console.log('🎯 Specific VerusIDs of Interest:');
    console.log('=================================\n');

    const specificVerusIDs = [
      { name: 'Caribu66', address: 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB' },
      { name: 'joanna', address: 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5' },
      { name: 'VCF', address: 'iQUHYRcKtgB7xXV1y5NpvzSK3Qb6ToNAqg' },
    ];

    for (const verusID of specificVerusIDs) {
      const result = await pool.query(
        'SELECT identity_address, base_name, friendly_name, first_seen_block FROM identities WHERE identity_address = $1',
        [verusID.address]
      );

      if (result.rows.length > 0) {
        const data = result.rows[0];

        if (data.first_seen_block) {
          try {
            const blockHash = await rpcCall('getblockhash', [
              data.first_seen_block,
            ]);
            const block = await rpcCall('getblock', [blockHash, 2]);
            const creationDate = new Date(block.time * 1000);

            console.log(
              `${data.friendly_name || data.base_name} (${verusID.name}):`
            );
            console.log(
              `  - Creation Block: ${data.first_seen_block.toLocaleString()}`
            );
            console.log(
              `  - Creation Date: ${creationDate.toLocaleDateString()}`
            );
            console.log(
              `  - Creation Time: ${creationDate.toLocaleTimeString()}`
            );
            console.log('');
          } catch (error) {
            console.log(
              `${data.friendly_name || data.base_name} (${verusID.name}):`
            );
            console.log(
              `  - Creation Block: ${data.first_seen_block.toLocaleString()}`
            );
            console.log(`  - Error getting date: ${error.message}`);
            console.log('');
          }
        } else {
          console.log(
            `${data.friendly_name || data.base_name} (${verusID.name}):`
          );
          console.log(`  - No creation block information available`);
          console.log('');
        }
      } else {
        console.log(`${verusID.name}:`);
        console.log(`  - Not found in database`);
        console.log('');
      }
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVerusIDCreationDates().catch(console.error);
