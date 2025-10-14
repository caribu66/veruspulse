#!/usr/bin/env node

const https = require('https');
const http = require('http');

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
            params: params,
            success: res.statusCode === 200 && !response.error,
            status: res.statusCode,
            result: response.result,
            error: response.error,
          });
        } catch (e) {
          resolve({
            method: method,
            params: params,
            success: false,
            status: res.statusCode,
            error: `Parse error: ${e.message}`,
            rawData: data,
          });
        }
      });
    });

    req.on('error', err =>
      resolve({
        method: method,
        params: params,
        success: false,
        error: `Connection error: ${err.message}`,
      })
    );
    req.on('timeout', () =>
      resolve({
        method: method,
        params: params,
        success: false,
        error: 'Timeout',
      })
    );
    req.setTimeout(5000);

    req.write(JSON.stringify(rpcRequest));
    req.end();
  });
}

async function testSpecificMethods() {
  console.log('🔍 Testing Specific Verus RPC Methods...\n');

  const methods = [
    // Core blockchain methods
    { method: 'getblockchaininfo', params: [] },
    { method: 'getmininginfo', params: [] },
    { method: 'getmempoolinfo', params: [] },
    { method: 'getwalletinfo', params: [] }, // replaces deprecated getstakinginfo
    { method: 'getnetworkinfo', params: [] },
    { method: 'getdifficulty', params: [] },
    { method: 'getconnectioncount', params: [] },
    { method: 'getnettotals', params: [] },
    { method: 'getnetworkhashps', params: [120, -1] },
    { method: 'getchaintips', params: [] },
    { method: 'getchaintxstats', params: [] },
    { method: 'gettxoutsetinfo', params: [] },

    // Transaction and block methods
    { method: 'getrawmempool', params: [false] },
    { method: 'getblocktemplate', params: [{}] },

    // Verus-specific methods
    { method: 'listidentities', params: [] },
    { method: 'getidentity', params: ['test'] },
    { method: 'getidentityhistory', params: ['test'] },
    { method: 'getcurrency', params: ['*'] },
    { method: 'getcurrencystate', params: ['*'] },
    { method: 'getcurrencydefinition', params: ['*'] },
    { method: 'getcurrencyconverters', params: ['*'] },
    { method: 'getcurrencyreserves', params: ['*'] },
    { method: 'getcurrencysupply', params: ['*'] },
    { method: 'getpbaaschain', params: ['*'] },
    {
      method: 'getnotarizationdata',
      params: ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'],
    },
    {
      method: 'getnotarizationcount',
      params: ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'],
    },
    { method: 'getnotarizationdatabyheight', params: [1] },
    {
      method: 'getnotarizationdatabyhash',
      params: [
        '0000000000000000000000000000000000000000000000000000000000000000',
      ],
    },
    { method: 'getnotarizationdatabyindex', params: [0] },
    { method: 'getnotarizationdatabytime', params: [Date.now()] },

    // Legacy methods
    { method: 'getinfo', params: [] },
    { method: 'getpeerinfo', params: [] },
    { method: 'help', params: [] },
  ];

  for (const { method, params } of methods) {
    try {
      console.log(`Testing ${method} with params:`, params);
      const result = await testRPCMethod(method, params);

      if (result.success) {
        console.log(`✅ ${method}: Success`);
        if (Array.isArray(result.result)) {
          console.log(`   Result count: ${result.result.length}`);
          if (result.result.length > 0) {
            console.log(
              `   Sample: ${JSON.stringify(result.result[0]).substring(0, 100)}...`
            );
          }
        } else if (
          typeof result.result === 'object' &&
          result.result !== null
        ) {
          console.log(
            `   Result keys: ${Object.keys(result.result).slice(0, 5).join(', ')}`
          );
          console.log(
            `   Sample: ${JSON.stringify(result.result).substring(0, 200)}...`
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

testSpecificMethods();
