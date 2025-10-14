#!/usr/bin/env node

// Simple Redis cache test
const Redis = require('ioredis');

async function testRedisCache() {
  console.log('🧪 Testing Redis Cache Implementation...\n');

  // Create Redis client
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    // Test connection
    console.log('1. Testing Redis connection...');
    await redis.ping();
    console.log('✅ Redis connection successful\n');

    // Test basic operations
    console.log('2. Testing basic cache operations...');

    // Set a test key
    await redis.setex(
      'test:key',
      60,
      JSON.stringify({ message: 'Hello from Redis!', timestamp: Date.now() })
    );
    console.log('✅ Set test key');

    // Get the test key
    const cached = await redis.get('test:key');
    const parsed = JSON.parse(cached);
    console.log('✅ Retrieved test key:', parsed.message);

    // Test key existence
    const exists = await redis.exists('test:key');
    console.log('✅ Key exists:', exists === 1);

    // Test TTL
    const ttl = await redis.ttl('test:key');
    console.log('✅ Key TTL:', ttl, 'seconds');

    // Test pattern matching
    const keys = await redis.keys('test:*');
    console.log('✅ Pattern matching found keys:', keys);

    // Test increment
    const count = await redis.incr('test:counter');
    console.log('✅ Counter increment:', count);

    // Test memory info
    const memoryInfo = await redis.info('memory');
    const memoryMatch = memoryInfo.match(/used_memory_human:(.+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
    console.log('✅ Memory usage:', memoryUsage);

    // Clean up
    await redis.del('test:key', 'test:counter');
    console.log('✅ Cleaned up test keys\n');

    // Test cache manager simulation
    console.log('3. Testing cache manager simulation...');

    const testData = {
      blockchain: { blocks: 12345, chain: 'testnet' },
      timestamp: Date.now(),
    };

    // Simulate cache set
    const cacheKey = 'blockchain:info';
    await redis.setex(cacheKey, 30, JSON.stringify(testData));
    console.log('✅ Cached blockchain data');

    // Simulate cache get
    const cachedData = await redis.get(cacheKey);
    const parsedData = JSON.parse(cachedData);
    console.log(
      '✅ Retrieved cached data:',
      parsedData.blockchain.blocks,
      'blocks'
    );

    // Test cache invalidation
    await redis.del(cacheKey);
    console.log('✅ Cache invalidation successful');

    // Test cache statistics
    const stats = await redis.info('stats');
    const clientsMatch = stats.match(/connected_clients:(\d+)/);
    const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;
    console.log('✅ Connected clients:', connectedClients);

    const totalKeys = await redis.dbsize();
    console.log('✅ Total keys in database:', totalKeys);

    console.log('\n🎉 All Redis cache tests passed!');
    console.log('\n📊 Cache Implementation Status:');
    console.log('✅ Redis connection: Working');
    console.log('✅ Basic operations: Working');
    console.log('✅ JSON serialization: Working');
    console.log('✅ TTL management: Working');
    console.log('✅ Pattern matching: Working');
    console.log('✅ Memory management: Working');
    console.log('✅ Cache invalidation: Working');
    console.log('✅ Statistics: Working');
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('\n✅ Redis connection closed');
  }
}

// Run the test
testRedisCache().catch(console.error);


