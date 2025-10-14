# Verus RPC Best Practices

This document outlines best practices for making RPC calls to the Verus daemon to avoid overwhelming the server and ensure optimal performance.

## Rate Limiting

### Default Rate Limits

Our RPC client implements the following default rate limits:

- **10 requests per second**
- **300 requests per minute**
- **10,000 requests per hour**
- **20 burst requests** (can exceed per-second limit briefly)

### Custom Rate Limiting

You can create custom rate limiters for different use cases:

```typescript
import {
  createRateLimiter,
  conservativeRateLimiter,
  aggressiveRateLimiter,
} from '@/lib/utils/rate-limiter';

// Conservative (safer for shared nodes)
const conservative = conservativeRateLimiter; // 5/sec, 150/min, 5000/hour

// Aggressive (for dedicated nodes)
const aggressive = aggressiveRateLimiter; // 20/sec, 600/min, 20000/hour

// Custom configuration
const custom = createRateLimiter({
  maxRequestsPerSecond: 15,
  maxRequestsPerMinute: 400,
  maxRequestsPerHour: 15000,
  burstLimit: 30,
});
```

## Error Handling

### RPC Error Types

The Verus RPC can return various error codes:

- **-1**: RPC connection errors
- **-32600**: Invalid Request
- **-32601**: Method not found
- **-32602**: Invalid params
- **-32603**: Internal error

### Retry Logic

Implement exponential backoff for transient errors:

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Batch Requests

### Efficient Batch Processing

Use batch requests to reduce network overhead:

```typescript
// Instead of multiple individual calls
const blockHash1 = await rpcClient.getBlockHash(1000);
const blockHash2 = await rpcClient.getBlockHash(1001);
const blockHash3 = await rpcClient.getBlockHash(1002);

// Use batch calls
const results = await rpcClient.batchCall([
  { method: 'getblockhash', params: [1000] },
  { method: 'getblockhash', params: [1001] },
  { method: 'getblockhash', params: [1002] },
]);
```

### Batch Size Limits

- Keep batch sizes reasonable (10-50 requests max)
- Monitor response times and adjust accordingly
- Consider breaking large batches into smaller chunks

## Caching Strategies

### Local Caching

Cache frequently accessed data to reduce RPC calls:

```typescript
import { Cache } from 'memory-cache';

const cache = new Cache();

async function getCachedBlockInfo(height: number) {
  const cacheKey = `block-${height}`;
  let blockInfo = cache.get(cacheKey);

  if (!blockInfo) {
    blockInfo = await rpcClient.getBlock({ height });
    cache.put(cacheKey, blockInfo, 60000); // Cache for 1 minute
  }

  return blockInfo;
}
```

### Cache Invalidation

- Invalidate cache when new blocks are mined
- Use appropriate TTL based on data freshness requirements
- Consider using Redis for distributed caching

## Connection Management

### Connection Pooling

For high-traffic applications, consider connection pooling:

```typescript
import { Pool } from 'generic-pool';

const pool = Pool.create({
  create: () => new RPCClient(),
  destroy: client => client.destroy(),
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 10000,
});
```

### Keep-Alive Connections

Configure HTTP keep-alive to reduce connection overhead:

```typescript
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 30000,
});
```

## Monitoring and Logging

### Rate Limit Monitoring

Monitor rate limit status:

```typescript
const status = rpcClient.getRateLimitStatus();
console.log(`Remaining requests: ${status.remaining}`);
console.log(`Is limited: ${status.isLimited}`);

if (status.isLimited) {
  console.log(`Retry after: ${status.retryAfter}ms`);
}
```

### Performance Metrics

Track RPC performance:

```typescript
const startTime = Date.now();
try {
  const result = await rpcClient.getBlockchainInfo();
  const duration = Date.now() - startTime;
  console.log(`RPC call took ${duration}ms`);
} catch (error) {
  console.error(`RPC call failed after ${Date.now() - startTime}ms`);
}
```

## Best Practices Summary

### Do's ✅

- **Use rate limiting** to prevent overwhelming the daemon
- **Implement proper error handling** with retry logic
- **Batch requests** when possible to reduce network overhead
- **Cache frequently accessed data** locally
- **Monitor rate limit status** and adjust accordingly
- **Use appropriate timeouts** for different operations
- **Log RPC performance** for monitoring and debugging

### Don'ts ❌

- **Don't hammer the RPC** with rapid successive calls
- **Don't ignore rate limits** - respect the daemon's capacity
- **Don't make unnecessary calls** - cache when possible
- **Don't use blocking calls** in production without timeouts
- **Don't ignore errors** - handle them gracefully
- **Don't hardcode credentials** - use environment variables

## Environment Configuration

### RPC Connection Settings

```bash
# .env file
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=your_username
VERUS_RPC_PASSWORD=your_password
VERUS_RPC_TIMEOUT=10000
```

### Rate Limit Configuration

```typescript
// For different environments
const devConfig = {
  maxRequestsPerSecond: 5,
  maxRequestsPerMinute: 150,
  maxRequestsPerHour: 5000,
};

const prodConfig = {
  maxRequestsPerSecond: 20,
  maxRequestsPerMinute: 600,
  maxRequestsPerHour: 20000,
};
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if Verus daemon is running
   - Verify RPC host and port configuration
   - Check firewall settings

2. **Authentication Failed**
   - Verify RPC username and password
   - Check rpcuser and rpcpassword in verus.conf

3. **Rate Limited**
   - Check current rate limit status
   - Implement backoff strategy
   - Consider using multiple RPC endpoints

4. **Timeout Errors**
   - Increase timeout values for slow operations
   - Check network connectivity
   - Monitor daemon performance

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import { logger } from '@/lib/utils/logger';

// Enable debug mode
logger.level = 'debug';

// Monitor RPC calls
rpcClient
  .call('getblockchaininfo')
  .then(result => logger.debug('RPC Success', result))
  .catch(error => logger.error('RPC Error', error));
```

## Performance Optimization

### Async Processing

Use async/await for non-blocking operations:

```typescript
// Process multiple requests concurrently (within rate limits)
const promises = [
  rpcClient.getBlock({ height: 1000 }),
  rpcClient.getBlock({ height: 1001 }),
  rpcClient.getBlock({ height: 1002 }),
];

const results = await Promise.all(promises);
```

### Memory Management

- Monitor memory usage for large batch operations
- Implement pagination for large data sets
- Clean up unused connections and caches

This comprehensive approach ensures reliable, efficient, and respectful RPC communication with the Verus daemon while maintaining optimal performance for your application.
