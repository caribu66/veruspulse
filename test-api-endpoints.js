#!/usr/bin/env node

const http = require('http');

async function testAPIEndpoint(endpoint) {
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
    req.setTimeout(5000);
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('🔍 Testing API Endpoints...\n');

  const endpoints = [
    '/api/health',
    '/api/blockchain-info',
    '/api/mining-info',
    '/api/mempool/size',
    '/api/real-staking-data',
    '/api/docs',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testAPIEndpoint(endpoint);

      if (result.status === 200) {
        console.log(`✅ ${endpoint}: Success`);
        if (result.data.success !== undefined) {
          console.log(`   Success: ${result.data.success}`);
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

testAllEndpoints();
