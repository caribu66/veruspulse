#!/usr/bin/env node

const http = require('http');

async function testConsolidatedAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/consolidated-data',
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

async function runTest() {
  console.log('🔍 Testing Consolidated API...\n');

  try {
    const result = await testConsolidatedAPI();

    if (result.status === 200 && result.data.success) {
      console.log('✅ Consolidated API: Success');
      console.log(
        `📊 Success Rate: ${result.data.meta.successRate.toFixed(1)}%`
      );
      console.log(`⏱️  Response Time: ${result.data.meta.responseTime}ms`);

      const data = result.data.data;
      console.log('\n📈 Data Sources:');
      console.log(`  Blockchain: ${data.blockchain ? '✅' : '❌'}`);
      console.log(`  Mining: ${data.mining ? '✅' : '❌'}`);
      console.log(`  Mempool: ${data.mempool ? '✅' : '❌'}`);
      console.log(`  Network: ${data.network ? '✅' : '❌'}`);

      if (data.blockchain) {
        console.log(`\n🔗 Blockchain Info:`);
        console.log(`  Chain: ${data.blockchain.chain}`);
        console.log(`  Blocks: ${data.blockchain.blocks?.toLocaleString()}`);
        console.log(
          `  Difficulty: ${data.blockchain.difficulty?.toLocaleString()}`
        );
      }

      if (data.mining) {
        console.log(`\n⛏️  Mining Info:`);
        console.log(
          `  Hash Rate: ${data.mining.networkhashps ? (data.mining.networkhashps / 1000000000).toFixed(2) + ' GH/s' : 'N/A'}`
        );
        console.log(`  Pooled TX: ${data.mining.pooledtx || 0}`);
      }

      if (data.mempool) {
        console.log(`\n📦 Mempool Info:`);
        console.log(`  Size: ${data.mempool.size || 0} transactions`);
        console.log(`  Bytes: ${data.mempool.bytes || 0}`);
      }

      if (data.network) {
        console.log(`\n🌐 Network Info:`);
        console.log(`  Active: ${data.network.networkactive ? 'Yes' : 'No'}`);
        console.log(`  Connections: ${data.network.connections || 0}`);
      }
    } else {
      console.log('❌ Consolidated API: Failed');
      console.log(`Status: ${result.status}`);
      if (result.data.error) {
        console.log(`Error: ${result.data.error}`);
      }
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

runTest();
