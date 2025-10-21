# RPC Spam Fix - October 20, 2025

## Problem

The terminal was being flooded with retry warnings for the `listcurrencies` RPC call:

```
⚠️ [WARN] RPC listcurrencies
⚠️ [WARN] ⚠️ RPC Error for listcurrencies, retrying in 2000ms:
Details: "HTTP error! status: 400"
```

This was repeating hundreds of times per minute, making the logs unusable.

## Root Cause

1. **Multiple API endpoints calling `/api/pbaas-prices`**:
   - `/api/live-prices` calls it twice (lines 38 and 139)
   - Multiple ticker components poll `/api/live-prices` frequently:
     - `pbaas-price-ticker.tsx` - every 30 seconds
     - `verus-price-ticker.tsx` - every 6 seconds
     - `moving-price-ticker.tsx` - every 5 seconds
     - `minimal-price-indicator.tsx` - every 10 seconds

2. **Failing RPC call**:
   - `listcurrencies` with `{systemtype: 'pbaas'}` parameter was failing with HTTP 400
   - The RPC endpoint doesn't support the `systemtype` filter parameter
3. **Retry amplification**:
   - Each failed call triggered 3 retry attempts (with exponential backoff: 2s, 4s, 8s)
   - With 12+ calls per minute × 3 retries = 36+ retry log messages per minute
   - Each retry logged multiple lines = 100+ log lines per minute

4. **Unnecessary RPC calls**:
   - The route had `|| true` on line 90 forcing it to always use mock data
   - But it still attempted the failing RPC call first before falling back

## Solution

Modified `/app/api/pbaas-prices/route.ts` to skip the failing RPC calls entirely:

1. **Added `USE_MOCK_DATA` flag** - Set to `true` to bypass RPC calls
2. **Early return with mock data** - Returns immediately without attempting RPC
3. **Preserved RPC logic** - Commented out for future reference when RPC is properly configured

### Changes Made

```typescript
// Simple in-memory cache to reduce load (30 second TTL)
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return addSecurityHeaders(NextResponse.json(cachedData));
  }

  // Skip RPC calls and use mock data directly
  const USE_MOCK_DATA = true; // Set to false to re-enable RPC calls

  if (USE_MOCK_DATA) {
    logger.info(
      'Using realistic mock data based on cryptodashboard.faldt.net (RPC not configured)'
    );
    // ... return mock data and cache it
    cachedData = responseData;
    cacheTimestamp = Date.now();
    return addSecurityHeaders(response);
  }

  // ===== RPC Logic (currently disabled) =====
  // Commented out until RPC endpoint supports required filters
}
```

## Result

✅ **Terminal spam eliminated** - No more retry warnings flooding the logs
✅ **Functionality preserved** - Mock data still being served to all components  
✅ **Performance improved** - No wasted RPC calls and retry attempts
✅ **Logs readable** - Can now see important messages without spam
✅ **Caching added** - 30-second cache reduces redundant calls from ~12/min to ~2/min
✅ **Load reduced** - With multiple components polling, cache prevents duplicate processing

## Future Work

When the Verus RPC endpoint is properly configured and supports the required parameters:

1. Set `USE_MOCK_DATA = false` in `/app/api/pbaas-prices/route.ts`
2. Uncomment the RPC logic (lines 125-192)
3. Test that `listcurrencies` with `{systemtype: 'pbaas'}` works
4. Consider adding caching to reduce API call frequency

## Additional Optimizations Completed

✅ **Added caching**: Implemented 30-second in-memory cache at API route level

## Additional Optimizations to Consider

1. **Reduce polling frequency**: Some components poll every 5-6 seconds which is aggressive
2. **Deduplicate requests**: Use SWR or React Query to prevent duplicate simultaneous requests
3. **Use Next.js revalidation**: Add `export const revalidate = 30` for ISR caching

## Files Modified

- `/app/api/pbaas-prices/route.ts` - Skip failing RPC calls, use mock data directly
