# stake_events Table - Legacy Status

**Status:** ⚠️ DEPRECATED / LEGACY  
**Date:** October 21, 2025

---

## Summary

The `stake_events` table is considered **LEGACY** and should NOT be used by the API or new features.

## Current State

- **Records:** 802 stakes
- **Coverage:** 2 VerusIDs only
- **Block Range:** 1,077,805 - 3,767,983
- **Total Rewards:** 6,701 VRSC

## Comparison with staking_rewards (Primary Table)

| Metric      | stake_events | staking_rewards | Winner             |
| ----------- | ------------ | --------------- | ------------------ |
| Records     | 802          | 35,303          | ✅ staking_rewards |
| VerusIDs    | 2            | 162             | ✅ staking_rewards |
| Rewards     | 6,701 VRSC   | 379,115 VRSC    | ✅ staking_rewards |
| Used by API | ❌ No        | ✅ Yes          | ✅ staking_rewards |

## Why Deprecated?

1. **Incomplete Data:** Only 802 stakes vs 35,303 in staking_rewards
2. **Poor Coverage:** Only 2 VerusIDs vs 162 in staking_rewards
3. **Not Used:** API never queries this table
4. **Schema Differences:** Missing fields like `block_hash`, `classifier`

## API Usage

**Confirmed:** No API endpoints query `stake_events`. All endpoints use `staking_rewards`:

```typescript
// All staking endpoints use staking_rewards
SELECT * FROM staking_rewards WHERE identity_address = $1
```

**Verified Files:**

- `app/api/verusid/[iaddr]/staking-stats/route.ts` ✅
- `app/api/verusid/[iaddr]/scan-progress/route.ts` ✅
- `app/api/verusids/staking-leaderboard/route.ts` ✅
- `app/api/verusids/stats/route.ts` ✅

## What To Do With This Table?

### Option 1: Keep as Archive (Recommended)

- Keep the table for historical reference
- Don't query it in production code
- Don't populate it with new data

### Option 2: Drop the Table

```sql
-- Only if you're certain you don't need it
DROP TABLE IF EXISTS stake_events CASCADE;
```

### Option 3: Migrate Remaining Data

```sql
-- Check if there's any unique data not in staking_rewards
SELECT COUNT(*) FROM stake_events se
WHERE NOT EXISTS (
  SELECT 1 FROM staking_rewards sr
  WHERE sr.txid = se.txid
  AND sr.identity_address = se.address
);
```

## Recommendation

**Keep the table but mark it as legacy.** It doesn't hurt to keep it, and it might be useful for debugging or historical analysis.

---

## Single Source of Truth

**Use `staking_rewards` exclusively for all staking data.**

See [DATABASE-CONSOLIDATION-PLAN.md](./DATABASE-CONSOLIDATION-PLAN.md) for complete details.
