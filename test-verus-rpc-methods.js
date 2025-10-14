#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test various Verus RPC methods to see what's available
async function testRPCMethod(method, params = []) {
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
        'Basic ' + Buffer.from(`${rpcUser}:${rpcPassword}`).toString('base64'),
    },
    timeout: 5000,
  };

  const rpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: method,
    params: params,
  };

  return new Promise(resolve => {
    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            method: method,
            success: res.statusCode === 200 && !response.error,
            status: res.statusCode,
            result: response.result,
            error: response.error,
          });
        } catch (e) {
          resolve({
            method: method,
            success: false,
            status: res.statusCode,
            error: `Parse error: ${e.message}`,
          });
        }
      });
    });

    req.on('error', () =>
      resolve({
        method: method,
        success: false,
        error: 'Connection error',
      })
    );
    req.on('timeout', () =>
      resolve({
        method: method,
        success: false,
        error: 'Timeout',
      })
    );
    req.setTimeout(5000);

    req.write(JSON.stringify(rpcRequest));
    req.end();
  });
}

async function testVerusRPCMethods() {
  console.log('🔍 Testing Verus RPC Methods...\n');

  const methods = [
    // Core blockchain methods
    'getblockchaininfo',
    'getmininginfo',
    'getmempoolinfo',
    'getwalletinfo', // replaces deprecated getstakinginfo
    'getnetworkinfo',
    'getdifficulty',
    'getconnectioncount',
    'getnettotals',
    'getnetworkhashps',
    'getchaintips',
    'getchaintxstats',
    'gettxoutsetinfo',

    // Transaction and block methods
    'getrawmempool',
    'getmempoolentry',
    'getmempoolancestors',
    'getmempooldescendants',
    'getblocktemplate',
    'gettxout',

    // Verus-specific methods
    'listidentities',
    'getidentity',
    'getidentityhistory',
    'getcurrency',
    'getcurrencystate',
    'getcurrencydefinition',
    'getcurrencyconverters',
    'getcurrencyreserves',
    'getcurrencysupply',
    'getpbaaschain',
    'getaddressdeltas',
    'getaddressmempool',
    'getnotarizationdata',
    'getnotarizationcount',
    'getnotarizationdatabyheight',
    'getnotarizationdatabyhash',
    'getnotarizationdatabyindex',
    'getnotarizationdatabytime',
    'getnotarizationdatabyblock',
    'getnotarizationdatabytx',
    'getnotarizationdatabyaddress',
    'getnotarizationdatabycurrency',
    'getnotarizationdatabychain',
    'getnotarizationdatabypbaas',

    // Legacy methods
    'getinfo',
    'getpeerinfo',
    'help',
  ];

  for (const method of methods) {
    try {
      console.log(`Testing ${method}...`);
      const result = await testRPCMethod(method);

      if (result.success) {
        console.log(`✅ ${method}: Success`);
        if (Array.isArray(result.result)) {
          console.log(`   Result count: ${result.result.length}`);
        } else if (
          typeof result.result === 'object' &&
          result.result !== null
        ) {
          console.log(
            `   Result keys: ${Object.keys(result.result).slice(0, 5).join(', ')}`
          );
        } else {
          console.log(
            `   Result: ${JSON.stringify(result.result).substring(0, 100)}...`
          );
        }
      } else {
        console.log(
          `❌ ${method}: ${result.error?.message || result.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.log(`❌ ${method}: ${error.message}`);
    }
    console.log('');
  }
}

testVerusRPCMethods();
