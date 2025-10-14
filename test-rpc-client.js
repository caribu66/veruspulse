#!/usr/bin/env node

// Test the RPC client directly
const { verusAPI } = require('./lib/rpc-client-robust.ts');

async function testRPCClient() {
  console.log('🔍 Testing RPC Client...\n');

  try {
    console.log('1️⃣ Testing getBlockchainInfo...');
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    console.log(
      '✅ getBlockchainInfo:',
      JSON.stringify(blockchainInfo, null, 2)
    );

    console.log('\n2️⃣ Testing getMiningInfo...');
    const miningInfo = await verusAPI.getMiningInfo();
    console.log('✅ getMiningInfo:', JSON.stringify(miningInfo, null, 2));

    console.log('\n3️⃣ Testing getMempoolInfo...');
    const mempoolInfo = await verusAPI.getMempoolInfo();
    console.log('✅ getMempoolInfo:', JSON.stringify(mempoolInfo, null, 2));

    console.log('\n4️⃣ Testing getNetworkInfo...');
    const networkInfo = await verusAPI.getNetworkInfo();
    console.log('✅ getNetworkInfo:', JSON.stringify(networkInfo, null, 2));

    console.log('\n🎉 All RPC calls successful!');
  } catch (error) {
    console.log('❌ RPC Client test failed:', error.message);
  }
}

testRPCClient();
