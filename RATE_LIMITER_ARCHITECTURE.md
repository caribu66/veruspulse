# Rate Limiter Architecture

## Current State Analysis

### ✅ GOOD: Shared RPC Rate Limiter

**Both main RPC clients share the same rate limiter instance:**

```typescript
// lib/utils/rate-limiter.ts
export const defaultRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 10,
  maxRequestsPerMinute: 300,
  maxRequestsPerHour: 10000,
  burstLimit: 20,
});

// lib/rpc-client.ts
export const rpcClient = new RPCClient(); // Uses defaultRateLimiter

// lib/rpc-client-robust.ts
export const verusAPI = new VerusAPIClient(); // Uses defaultRateLimiter (SAME INSTANCE)
```

**✅ No duplication here!** Both clients track requests in the same rate limiter.

---

### ⚠️ SEPARATE: HTTP API Rate Limiter

**Different rate limiter for HTTP endpoints:**

```typescript
// lib/middleware/security.ts
import { RateLimiter } from '@/lib/utils/validation'; // DIFFERENT CLASS!

const apiRateLimiter = new RateLimiter(60000, 100);      // API endpoints
const searchRateLimiter = new RateLimiter(60000, 20);    // Search endpoints
```

**This is intentional and correct!**
- HTTP API rate limiting (per IP address)
- RPC rate limiting (to Verus daemon)
- Two different concerns, two different limiters ✅

---

### ⚠️ MISSING: Fallback Client

**No rate limiting:**

```typescript
// lib/rpc-client-with-fallback.ts
export class VerusClientWithFallback {
  // NO rate limiter!
  async getBlock(hash: string) { ... }
  async getTransaction(txid: string) { ... }
}
```

**Not a problem** - This is only used as a fallback to public explorers when local daemon is down.

---

## Summary

### Current Architecture (CORRECT)

```
┌─────────────────────────────────────────────────────┐
│  Client Requests                                    │
│  (Browser/API)                                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  HTTP Rate Limiter         │
    │  (per IP address)          │
    │  - apiRateLimiter          │
    │  - searchRateLimiter       │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Next.js API Routes        │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  RPC Clients               │
    │  ┌──────────────────────┐  │
    │  │ defaultRateLimiter   │  │ ← SHARED SINGLETON
    │  │ (token bucket)       │  │
    │  └──────────┬───────────┘  │
    │             │               │
    │    ┌────────┴────────┐     │
    │    │                 │     │
    │    ▼                 ▼     │
    │  rpcClient      verusAPI   │
    │  (rarely used) (main)      │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Verus Daemon RPC          │
    └────────────────────────────┘
```

---

## No Duplication Issues!

### ✅ RPC Rate Limiter: **Single shared instance**
- `rpcClient` and `verusAPI` use the **same** `defaultRateLimiter`
- All RPC calls tracked together
- Stats reflect all application RPC usage

### ✅ HTTP Rate Limiter: **Intentionally separate**
- Different purpose (protect HTTP endpoints, not RPC)
- Different class implementation
- Works at middleware level

### ✅ Fallback Client: **No rate limiting needed**
- Only calls public APIs when daemon is down
- Low frequency usage
- External services have their own rate limits

---

## Verification

You can verify there's only ONE RPC rate limiter:

```typescript
import { rpcClient } from '@/lib/rpc-client';
import { verusAPI } from '@/lib/rpc-client-robust';

// Both return the SAME statistics
console.log(rpcClient.getRateLimiterStats());
console.log(verusAPI.getRateLimiterStats()); // SAME VALUES!
```

---

## Conclusion

**✅ NO DUPLICATION!** 

The architecture is correct:
- RPC rate limiting is **unified** (single instance)
- HTTP rate limiting is **separate by design**
- Fallback client has **no rate limiting by design**

All RPC calls from your application are tracked and rate-limited through the **single shared `defaultRateLimiter`** instance.

