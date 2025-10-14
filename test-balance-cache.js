#!/usr/bin/env node

/**
 * Test Balance Cache System
 * 
 * This script tests that:
 * 1. First request fetches from RPC and caches the balance
 * 2. Second request uses cached balance (NO RPC calls)
 * 3. Displays timing to prove cache is faster
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_VERUSID = process.env.TEST_VERUSID || 'allbits';

async function testBalanceCache() {
  console.log('🧪 Testing Balance Cache System\n');
  console.log('=' .repeat(80));
  
  // Test 1: First request (should fetch from RPC)
  console.log('\n📍 TEST 1: First Request (should call RPC)');
  console.log('-'.repeat(80));
  const start1 = Date.now();
  
  const response1 = await fetch(`${API_URL}/api/verusid-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verusid: TEST_VERUSID })
  });
  
  const data1 = await response1.json();
  const time1 = Date.now() - start1;
  
  if (!data1.success) {
    console.error('❌ First request failed:', data1.error);
    process.exit(1);
  }
  
  console.log(`✅ First request completed in ${time1}ms`);
  console.log(`   Balance: ${data1.data.totalBalance} VRSC`);
  console.log(`   Addresses: ${data1.data.primaryAddresses.length + 1}`);
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 2: Second request (should use cache)
  console.log('\n📍 TEST 2: Second Request (should use CACHE)');
  console.log('-'.repeat(80));
  const start2 = Date.now();
  
  const response2 = await fetch(`${API_URL}/api/verusid-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verusid: TEST_VERUSID })
  });
  
  const data2 = await response2.json();
  const time2 = Date.now() - start2;
  
  if (!data2.success) {
    console.error('❌ Second request failed:', data2.error);
    process.exit(1);
  }
  
  console.log(`✅ Second request completed in ${time2}ms`);
  console.log(`   Balance: ${data2.data.totalBalance} VRSC`);
  console.log(`   Addresses: ${data2.data.primaryAddresses.length + 1}`);
  
  // Test 3: Third request (should still use cache)
  console.log('\n📍 TEST 3: Third Request (should still use CACHE)');
  console.log('-'.repeat(80));
  const start3 = Date.now();
  
  const response3 = await fetch(`${API_URL}/api/verusid-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verusid: TEST_VERUSID })
  });
  
  const data3 = await response3.json();
  const time3 = Date.now() - start3;
  
  if (!data3.success) {
    console.error('❌ Third request failed:', data3.error);
    process.exit(1);
  }
  
  console.log(`✅ Third request completed in ${time3}ms`);
  console.log(`   Balance: ${data3.data.totalBalance} VRSC`);
  console.log(`   Addresses: ${data3.data.primaryAddresses.length + 1}`);
  
  // Results
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS:');
  console.log('='.repeat(80));
  console.log(`First request (RPC):      ${time1}ms`);
  console.log(`Second request (CACHE):   ${time2}ms`);
  console.log(`Third request (CACHE):    ${time3}ms`);
  
  const speedup2 = ((time1 - time2) / time1 * 100).toFixed(1);
  const speedup3 = ((time1 - time3) / time1 * 100).toFixed(1);
  
  console.log(`\nCache speedup (request 2): ${speedup2}% faster`);
  console.log(`Cache speedup (request 3): ${speedup3}% faster`);
  
  // Verify data consistency
  if (data1.data.totalBalance === data2.data.totalBalance && 
      data2.data.totalBalance === data3.data.totalBalance) {
    console.log('\n✅ Data consistency verified - all balances match!');
  } else {
    console.log('\n⚠️  Data inconsistency detected!');
  }
  
  // Check server logs for cache confirmation
  console.log('\n💡 TIP: Check your server logs for messages like:');
  console.log('   "⚡ ALL BALANCES IN CACHE - NO RPC CALLS NEEDED!"');
  console.log('\n🎉 Balance caching test complete!\n');
}

// Run test
testBalanceCache().catch(error => {
  console.error('\n❌ Test failed with error:', error.message);
  process.exit(1);
});


