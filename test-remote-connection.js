#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Test remote Verus daemon connection
async function testRemoteConnection() {
  console.log('🚀 Remote Verus Daemon Connection Test');
  console.log('======================================\n');

  const rpcHost = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPassword = process.env.VERUS_RPC_PASSWORD || 'verus';

  console.log(`📡 RPC Host: ${rpcHost}`);
  console.log(`👤 RPC User: ${rpcUser}`);
  console.log(`🔐 RPC Password: ${rpcPassword ? '***' : 'Not set'}\n`);

  // Test basic connectivity
  try {
    console.log('1️⃣ Testing remote connectivity...');

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
      timeout: 15000, // Increased timeout for remote connections
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
      req.write(JSON.stringify(rpcRequest));
      req.end();
    });

    console.log(`✅ Connection successful! Status: ${response.statusCode}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));

    if (response.data.result) {
      console.log('\n🎉 Remote Verus daemon is responding!');
      console.log(`📈 Chain: ${response.data.result.chain}`);
      console.log(`🔢 Blocks: ${response.data.result.blocks}`);
      console.log(`📊 Headers: ${response.data.result.headers}`);
      console.log(`⚡ Difficulty: ${response.data.result.difficulty}`);
      console.log(`🌐 Network Active: ${response.data.result.networkactive}`);
      console.log(`🔗 Connections: ${response.data.result.connections}`);
      console.log(
        `📈 Verification Progress: ${(response.data.result.verificationprogress * 100).toFixed(2)}%`
      );

      if (response.data.result.blocks < response.data.result.headers) {
        console.log(
          `⚠️  Daemon is syncing... (${response.data.result.headers - response.data.result.blocks} blocks behind)`
        );
      } else {
        console.log('✅ Daemon is fully synced!');
      }
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if remote daemon is running and accessible');
    console.log('2. Verify firewall settings on remote server (port 18843)');
    console.log(
      '3. Check RPC configuration in remote ~/.komodo/VRSC/verus.conf'
    );
    console.log(
      '4. Verify network connectivity: ping ' + new URL(rpcHost).hostname
    );
    console.log('5. Check if RPC credentials are correct');
    console.log('6. Ensure rpcallowip includes your development machine IP');
    return false;
  }

  return true;
}

async function testAdditionalMethods() {
  console.log('\n2️⃣ Testing additional RPC methods...');

  const methods = [
    { name: 'getmininginfo', params: [] },
    { name: 'getmempoolinfo', params: [] },
    { name: 'getnetworkinfo', params: [] },
    { name: 'getwalletinfo', params: [] },
  ];

  const rpcHost = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPassword = process.env.VERUS_RPC_PASSWORD || 'verus';

  for (const method of methods) {
    try {
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
        method: method.name,
        params: method.params,
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
        req.write(JSON.stringify(rpcRequest));
        req.end();
      });

      if (response.result) {
        console.log(`✅ ${method.name}: Success`);
        console.log(
          `   Result: ${JSON.stringify(response.result).substring(0, 100)}...`
        );
      } else if (response.error) {
        console.log(`❌ ${method.name}: Error - ${response.error.message}`);
      }
    } catch (error) {
      console.log(`❌ ${method.name}: Failed - ${error.message}`);
    }
  }
}

async function testNetworkLatency() {
  console.log('\n3️⃣ Testing network latency...');

  const rpcHost = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
  const hostname = new URL(rpcHost).hostname;

  const startTime = Date.now();

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`ping -c 3 ${hostname}`);
    const endTime = Date.now();

    console.log(`✅ Ping successful to ${hostname}`);
    console.log(`📊 Round-trip time: ${endTime - startTime}ms`);

    // Extract average time from ping output
    const avgTimeMatch = stdout.match(/avg = ([\d.]+)/);
    if (avgTimeMatch) {
      console.log(`📈 Average ping time: ${avgTimeMatch[1]}ms`);
    }
  } catch (error) {
    console.log(`⚠️  Ping test failed: ${error.message}`);
    console.log('   This might be normal if ICMP is blocked');
  }
}

// Run the tests
async function runTests() {
  const basicConnection = await testRemoteConnection();

  if (basicConnection) {
    await testAdditionalMethods();
    await testNetworkLatency();

    console.log('\n✨ Remote connection test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. If all tests passed, your remote setup is working');
    console.log('2. Start your development server: npm run dev');
    console.log('3. Monitor the daemon sync progress on the remote server');
    console.log('4. Consider setting up monitoring for the remote daemon');
  } else {
    console.log('\n❌ Remote connection test failed!');
    console.log('Please check the troubleshooting tips above.');
    process.exit(1);
  }
}

runTests().catch(console.error);
