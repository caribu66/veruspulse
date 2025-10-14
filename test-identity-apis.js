#!/usr/bin/env node

/**
 * Test script to verify Verus Identity APIs are enabled
 * Run this script to check if identity functionality is available
 */

const https = require('https');
const http = require('http');

// Configuration
const RPC_HOST = process.env.VERUS_RPC_HOST || 'http://localhost:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASSWORD = process.env.VERUS_RPC_PASSWORD || 'verus';

async function testIdentityAPI() {
  console.log('🔍 Testing Verus Identity APIs...\n');

  const url = new URL(RPC_HOST);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64'),
    },
    timeout: 10000,
  };

  // Test methods
  const tests = [
    {
      name: 'Basic Identity Lookup',
      method: 'getidentity',
      params: ['verus@'],
      description: 'Test if basic identity lookup works',
    },
    {
      name: 'Identity History',
      method: 'getidentityhistory',
      params: ['verus@'],
      description: 'Test if identity history is available',
    },
    {
      name: 'List Identities',
      method: 'listidentities',
      params: [],
      description: 'Test if identity listing works',
    },
  ];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log(`Description: ${test.description}`);

    try {
      const result = await makeRPCRequest(
        client,
        options,
        test.method,
        test.params
      );

      if (result.success) {
        console.log(`✅ ${test.name}: SUCCESS`);
        if (test.method === 'listidentities' && Array.isArray(result.data)) {
          console.log(`   Found ${result.data.length} identities`);
        } else if (result.data) {
          console.log(`   Identity data available`);
        }
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Error: ${result.error}`);

        if (
          result.error &&
          result.error.includes('Identity APIs not activated')
        ) {
          console.log(
            `   🔧 SOLUTION: Add 'identityindex=1' to your verus.conf file and restart the node`
          );
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   Error: ${error.message}`);
    }

    console.log('');
  }

  // Summary
  console.log('📋 SUMMARY:');
  console.log('If you see "Identity APIs not activated" errors:');
  console.log('1. Add "identityindex=1" to your verus.conf file');
  console.log('2. Restart your Verus node');
  console.log('3. Run this test again to verify');
  console.log('');
  console.log('Configuration file location:');
  console.log('- Linux/Mac: ~/.verus/verus.conf or ~/.komodo/VERUS/verus.conf');
  console.log('- Windows: %APPDATA%\\Verus\\verus.conf');
}

function makeRPCRequest(client, options, method, params = []) {
  return new Promise(resolve => {
    const rpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params,
    };

    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            success: !response.error && res.statusCode === 200,
            data: response.result,
            error: response.error?.message || response.error,
          });
        } catch (e) {
          resolve({
            success: false,
            data: null,
            error: `Parse error: ${e.message}`,
          });
        }
      });
    });

    req.on('error', err => {
      resolve({
        success: false,
        data: null,
        error: `Connection error: ${err.message}`,
      });
    });

    req.on('timeout', () => {
      resolve({
        success: false,
        data: null,
        error: 'Request timeout',
      });
    });

    req.setTimeout(10000);
    req.write(JSON.stringify(rpcRequest));
    req.end();
  });
}

// Run the test
testIdentityAPI().catch(console.error);
