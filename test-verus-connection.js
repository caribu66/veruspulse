#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test Verus daemon connection
async function testVerusConnection() {
  console.log('🔍 Testing Verus daemon connection...\n');

  const rpcHost = process.env.VERUS_RPC_HOST || 'http://localhost:18843';
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPassword = process.env.VERUS_RPC_PASSWORD || 'verus';

  console.log(`📡 RPC Host: ${rpcHost}`);
  console.log(`👤 RPC User: ${rpcUser}`);
  console.log(`🔐 RPC Password: ${rpcPassword ? '***' : 'Not set'}\n`);

  // Test basic connectivity
  try {
    console.log('1️⃣ Testing basic connectivity...');

    const url = new URL(rpcHost);
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
          Buffer.from(`${rpcUser}:${rpcPassword}`).toString('base64'),
      },
      timeout: 10000,
    };

    const rpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getblockchaininfo',
      params: [],
    };

    const response = await new Promise((resolve, reject) => {
      const req = client.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: JSON.parse(data),
            });
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(10000);

      req.write(JSON.stringify(rpcRequest));
      req.end();
    });

    console.log(`✅ Connection successful! Status: ${response.statusCode}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));

    if (response.data.result) {
      console.log('\n🎉 Verus daemon is responding!');
      console.log(`📈 Chain: ${response.data.result.chain}`);
      console.log(`🔢 Blocks: ${response.data.result.blocks}`);
      console.log(`⚡ Difficulty: ${response.data.result.difficulty}`);
      console.log(`🌐 Network Active: ${response.data.result.networkactive}`);
      console.log(`🔗 Connections: ${response.data.result.connections}`);
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if verusd is running: ps aux | grep verusd');
    console.log('2. Check RPC configuration in ~/.komodo/VRSC/verus.conf');
    console.log('3. Verify RPC credentials and host');
    console.log('4. Check firewall settings');
    console.log('5. Ensure verusd is fully synced');
  }
}

// Test additional RPC methods
async function testAdditionalMethods() {
  console.log('\n2️⃣ Testing additional RPC methods...\n');

  const methods = [
    'getmininginfo',
    'getmempoolinfo',
    'getwalletinfo', // replaces deprecated getstakinginfo
    'getnetworkinfo',
  ];

  for (const method of methods) {
    try {
      console.log(`Testing ${method}...`);

      const rpcHost = process.env.VERUS_RPC_HOST || 'http://localhost:18843';
      const rpcUser = process.env.VERUS_RPC_USER || 'verus';
      const rpcPassword = process.env.VERUS_RPC_PASSWORD || 'verus';

      const url = new URL(rpcHost);
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
            Buffer.from(`${rpcUser}:${rpcPassword}`).toString('base64'),
        },
        timeout: 5000,
      };

      const rpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [],
      };

      const response = await new Promise((resolve, reject) => {
        const req = client.request(options, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.setTimeout(5000);

        req.write(JSON.stringify(rpcRequest));
        req.end();
      });

      if (response.result) {
        console.log(`✅ ${method}: Success`);
        console.log(
          `   Result: ${JSON.stringify(response.result).substring(0, 100)}...`
        );
      } else if (response.error) {
        console.log(`❌ ${method}: Error - ${response.error.message}`);
      }
    } catch (error) {
      console.log(`❌ ${method}: Failed - ${error.message}`);
    }
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Verus Daemon Connection Test');
  console.log('================================\n');

  await testVerusConnection();
  await testAdditionalMethods();

  console.log('\n✨ Test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. If connection failed, check your verusd configuration');
  console.log('2. Ensure verusd is running and synced');
  console.log('3. Verify RPC credentials in your environment');
  console.log('4. Check the explorer logs for any issues');
}

runTests().catch(console.error);
