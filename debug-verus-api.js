#!/usr/bin/env node

const http = require('http');

async function debugAPIEndpoint(endpoint) {
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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          endpoint: endpoint,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000);
    req.end();
  });
}

async function debugVerusAPIs() {
  console.log('🔍 Debugging Verus API Endpoints...\n');

  const endpoints = [
    '/api/verus-identities',
    '/api/verus-currencies',
    '/api/verus-pbaas',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Debugging ${endpoint}...`);
      const result = await debugAPIEndpoint(endpoint);

      console.log(`Status: ${result.status}`);
      console.log(`Headers:`, result.headers);
      console.log(`Data:`, result.data.substring(0, 500));

      if (result.status !== 200) {
        try {
          const jsonData = JSON.parse(result.data);
          console.log(`Parsed Error:`, jsonData);
        } catch (e) {
          console.log(`Raw Error Data:`, result.data);
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
    console.log('---\n');
  }
}

debugVerusAPIs();
