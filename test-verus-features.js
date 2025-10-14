#!/usr/bin/env node

const http = require('http');

async function testVerusEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000);
    req.end();
  });
}

async function testVerusFeatures() {
  console.log('🔍 Testing Verus-Specific Features...\n');

  const endpoints = [
    '/api/verus-identities',
    '/api/verus-currencies',
    '/api/verus-pbaas',
    '/api/verus-simple',
    '/api/consolidated-data',
    '/api/real-staking-data',
    '/api/blockchain-info',
    '/api/mining-info',
    '/api/mempool/size',
    '/api/latest-blocks',
    '/api/latest-transactions',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testVerusEndpoint(endpoint);

      if (result.status === 200 && result.data.success) {
        console.log(`✅ ${endpoint}: Success`);
        console.log(`   Count: ${result.data.data.count || 0}`);

        if (endpoint.includes('identities') && result.data.data.identities) {
          console.log(
            `   Sample identities: ${result.data.data.identities
              .slice(0, 3)
              .map(i => i.name || i.identity?.name)
              .join(', ')}`
          );
        } else if (
          endpoint.includes('currencies') &&
          result.data.data.currencies
        ) {
          console.log(
            `   Sample currencies: ${result.data.data.currencies
              .slice(0, 3)
              .map(c => c.name || c.symbol)
              .join(', ')}`
          );
        } else if (endpoint.includes('pbaas') && result.data.data.pbaasChains) {
          console.log(
            `   Sample PBaaS chains: ${result.data.data.pbaasChains
              .slice(0, 3)
              .map(p => p.name)
              .join(', ')}`
          );
        }
      } else {
        console.log(`❌ ${endpoint}: Status ${result.status}`);
        if (result.data.error) {
          console.log(`   Error: ${result.data.error}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
    console.log('');
  }
}

testVerusFeatures();
