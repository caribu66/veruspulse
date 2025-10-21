# RPC Monitoring & Rate Limiting

This document explains how to monitor RPC usage and ensure you're not overwhelming the Verus daemon.

## Quick Check

To quickly check if you're hammering the RPC:

```bash
npm run rpc:check
```

This will show:

- ✅ **Live RPC usage** in real-time (requests per second/minute/hour)
- 📊 **Rate limit configuration** (how many requests are allowed)
- 💾 **Cache settings** (how caching reduces RPC calls)
- 🔄 **Frontend polling intervals** (how often the UI makes requests)
- 💡 **Recommendations** for optimization

## Real-Time Monitoring

For continuous monitoring with live updates:

```bash
npm run rpc:monitor
```

This provides:

- Real-time request tracking
- Visual progress bars showing usage vs. limits
- Method breakdown (which RPC calls are being made)
- Color-coded status indicators:
  - 🟢 **HEALTHY** (< 50% of limits)
  - 🟡 **MODERATE** (50-74% of limits)
  - 🟠 **WARNING** (75-89% of limits)
  - 🔴 **CRITICAL** (≥ 90% of limits)

## How Rate Limiting Works

### Default Limits

The application enforces the following rate limits on all RPC calls:

- **10 requests per second**
- **300 requests per minute**
- **10,000 requests per hour**
- **20 burst tokens** (allows temporary spikes)

These limits are enforced at the lowest layer of the RPC client, so all API endpoints automatically respect them.

### Token Bucket Algorithm

The rate limiter uses a **token bucket** algorithm:

1. Burst tokens refill at 1 token per second
2. Each request consumes 1 token
3. If no tokens are available, requests wait automatically
4. This allows temporary bursts while maintaining average rate

### Multiple Limit Windows

The system tracks requests in three time windows:

- **1 second** - Prevents rapid-fire requests
- **1 minute** - Manages medium-term load
- **1 hour** - Protects against sustained high usage

A request is only allowed if it passes ALL three checks.

## Cache Strategy

The application uses aggressive caching to minimize actual RPC calls:

### Cache TTLs (Time To Live)

| Data Type       | Cache TTL | Reason                              |
| --------------- | --------- | ----------------------------------- |
| Blockchain Info | 30s       | Changes slowly (new blocks ~1 min)  |
| Mining Info     | 30s       | Mining stats don't change rapidly   |
| Network Info    | 30s       | Network stats are relatively stable |
| Mempool         | 10s       | Changes frequently (new txs)        |
| Block Data      | 5 min     | Historical blocks never change      |
| VerusID         | 5 min     | Identity data is stable             |

### Cache Hit Rates

With proper caching:

- **~70-80% reduction** in actual RPC calls
- Frontend polling hits cache instead of RPC
- Multiple components share cached data

Example: If 5 components request blockchain info every 30s, only 1 RPC call is made (the other 4 hit cache).

## Current Load Analysis

### Frontend Polling

The UI makes periodic requests:

| Component         | Interval | Endpoint                    | Notes               |
| ----------------- | -------- | --------------------------- | ------------------- |
| Main Dashboard    | 60s      | `/api/consolidated-data`    | High cache hit rate |
| Live Blocks       | 60s      | `/api/latest-blocks`        | Block feed          |
| Mempool           | 45s      | `/api/mempool/transactions` | Transaction feed    |
| Status Indicators | 30s      | `/api/blockchain-info`      | Multiple components |

### Estimated Load

**Worst case (no cache hits):**

- ~7-8 RPC calls per minute

**Typical case (with caching):**

- ~2-3 actual RPC calls per minute

**This is well within safe limits** (300/min allowed).

## API Endpoint

You can also query RPC statistics programmatically:

```bash
curl http://localhost:3000/api/rpc-stats
```

Response includes:

- Real-time request counts
- Current usage percentages
- Available request capacity
- Health status
- Cache configuration

## Optimization Tips

### 1. Increase Cache TTLs

If data freshness isn't critical, increase cache TTLs in `lib/cache/cache-utils.ts`:

```typescript
export const CACHE_TTL = {
  BLOCKCHAIN_INFO: 60, // Increase from 30s to 60s
  // ...
};
```

### 2. Reduce Frontend Polling

Adjust polling intervals in frontend components if 60s updates are too frequent.

### 3. Use WebSocket (ZMQ) for Real-Time Updates

Instead of polling for new blocks, use ZMQ notifications:

```typescript
// Subscribe to new blocks
zmq.subscribeHashBlock(hash => {
  // Update UI immediately without polling
});
```

This can **reduce RPC calls by 50-70%**.

### 4. Batch RPC Calls

Instead of:

```typescript
const blockchain = await rpc.getBlockchainInfo();
const mining = await rpc.getMiningInfo();
const network = await rpc.getNetworkInfo();
```

Use batching:

```typescript
const [blockchain, mining, network] = await rpc.batch([
  { method: 'getblockchaininfo' },
  { method: 'getmininginfo' },
  { method: 'getnetworkinfo' },
]);
```

This makes 1 HTTP request instead of 3.

## Troubleshooting

### If You See High Usage

1. **Check the live monitor:**

   ```bash
   npm run rpc:monitor
   ```

2. **Review method breakdown** to see which calls are most frequent

3. **Common causes:**
   - Background scripts running (check `scripts/` directory)
   - Multiple browser tabs open
   - Aggressive frontend polling
   - Cache not working (check Redis/memory)

### If Rate Limits Are Hit

The system automatically handles rate limiting by:

- Queueing requests
- Adding exponential backoff
- Waiting for capacity to become available

You'll see in logs:

```
⏳ Rate limit reached, waiting 1000ms...
```

This is **normal and safe** - requests will succeed after waiting.

### Adjusting Rate Limits

If you have a dedicated Verus node, you can increase limits:

```typescript
// lib/rpc-client.ts
import { aggressiveRateLimiter } from '@/lib/utils/rate-limiter';

const rpcClient = new RPCClient({
  maxRequestsPerSecond: 20, // Double the default
  maxRequestsPerMinute: 600, // Double the default
  maxRequestsPerHour: 20000, // Double the default
  burstLimit: 40, // Double the burst
});
```

⚠️ **Warning:** Only increase limits if you control the Verus node. Public nodes should use conservative limits.

## Best Practices

### ✅ DO

- ✅ Use the provided rate limiter for all RPC calls
- ✅ Implement caching with appropriate TTLs
- ✅ Use batch RPC calls when possible
- ✅ Monitor usage periodically
- ✅ Use ZMQ for real-time updates when available

### ❌ DON'T

- ❌ Make RPC calls in tight loops
- ❌ Bypass the rate limiter
- ❌ Poll more frequently than necessary
- ❌ Ignore cache hits
- ❌ Make multiple requests for the same data

## Summary

✅ **You are NOT hammering the RPC** if:

- Usage is < 50% of limits
- Cache hit rate is high (> 70%)
- Request patterns are predictable (polling at set intervals)
- No rate limit warnings in logs

⚠️ **Review your code** if:

- Usage consistently > 75% of limits
- Many requests in burst patterns
- Frequent rate limit warnings
- Unexpected spikes in traffic

🔴 **Immediate action needed** if:

- Usage consistently > 90% of limits
- Rate limits being hit constantly
- Background scripts running wild
- Node becoming unresponsive

---

## Quick Reference

```bash
# Check current RPC load
npm run rpc:check

# Monitor real-time (continuous)
npm run rpc:monitor

# View RPC optimization report
cat RPC_OPTIMIZATION_REPORT.md

# Test RPC connection
curl http://localhost:3000/api/rpc-stats
```

For more details, see:

- [RPC Best Practices](./RPC-BEST-PRACTICES.md)
- [Cache Configuration](../lib/cache/cache-utils.ts)
- [Rate Limiter Implementation](../lib/utils/rate-limiter.ts)
