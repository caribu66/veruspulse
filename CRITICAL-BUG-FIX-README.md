# 🚨 CRITICAL BUG FIX: Stake Attribution Issue

## Problem Discovered

A **critical data integrity bug** was discovered where VerusIDs were showing **incorrect staking rewards** in the statistics.

### The Bug

The statistics calculation was counting **ALL stakes** where the `identity_address` field matched, including:

1. ✅ **Direct I-address stakes** (where the VerusID staked with its own I-address) - **CORRECT**
2. ❌ **Indirect stakes** (where OTHER addresses like R-addresses staked and sent rewards to the I-address) - **WRONG!**

### Real-World Example

A VerusID at `iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X` with only **193 VRSC** balance was showing **88,937.60 VRSC in rewards**!

This was mathematically impossible - the VerusID was receiving rewards from **other addresses** that staked on its behalf, and these were incorrectly being counted as if the VerusID had staked them itself.

## Root Cause

All statistics calculation queries were missing the critical filter:

```sql
WHERE source_address = identity_address
```

This caused the system to aggregate rewards from:

- The I-address itself (correct)
- Primary R-addresses (incorrect)
- Any other address sending rewards to the I-address (incorrect)

## Files Fixed

### 1. Statistics Calculation Scripts

- ✅ `scripts/calculate-statistics.sql`
- ✅ `scripts/calculate-statistics-fixed.sql`
- ✅ `scripts/recalculate-all-stats.js`

### 2. Admin API Endpoints

- ✅ `app/api/admin/recalculate-statistics/route.ts`
- ✅ `app/api/admin/simple-recalculate/route.ts`
- ✅ `app/api/admin/remove-duplicates/route.ts`
- ✅ `app/api/admin/fix-corrupted-data/route.ts`
- ✅ `app/api/admin/cleanup-corrupted-rewards/route.ts`

### 3. Statistics Display (Already Correct ✅)

- `app/api/verusid/[iaddr]/staking-stats/route.ts` - **Already had the correct filter!**

This explains why the time-series data in the charts was correct, but the summary statistics from the `verusid_statistics` table were wrong.

## The Fix

All queries now include:

```sql
FROM staking_rewards sr
WHERE sr.source_address = sr.identity_address  -- CRITICAL: Only count direct I-address stakes
```

This ensures that **ONLY** stakes where the VerusID staked directly with its own I-address are counted.

## How to Apply the Fix

### Run the Migration Script

```bash
cd /home/explorer/verus-dapp
node scripts/FIX-CRITICAL-stake-attribution-bug.js
```

This script will:

1. **Analyze** the current state and show the extent of the problem
2. **Recalculate** all statistics with the correct filter
3. **Display** before/after comparison

### Expected Results

After running the fix:

- VerusIDs that **never** staked with their own I-address will show **0 stakes** (correct)
- VerusIDs that **did** stake with their I-address will show only those direct stakes
- Total network statistics will reflect **actual** staking activity, not delegated rewards

## Impact

### VerusIDs Affected

- Any VerusID that received rewards from other addresses (R-addresses, delegated staking, etc.)
- The statistics will **decrease** significantly for these VerusIDs

### VerusIDs NOT Affected

- VerusIDs that only stake with their own I-address (most VerusIDs)
- These will show the same correct statistics as before

## Verification

After applying the fix, verify specific VerusIDs:

```bash
# Check a specific VerusID
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  SELECT
    address,
    total_stakes,
    total_rewards_satoshis / 100000000.0 as rewards_vrsc
  FROM verusid_statistics
  WHERE address = 'iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X'
\`).then(r => { console.log(r.rows); process.exit(); });
"
```

## Technical Details

### Database Schema

The `staking_rewards` table has two critical fields:

- `identity_address` - The I-address that **received** the rewards
- `source_address` - The address that **staked** to earn the rewards

For **direct I-address stakes**: `source_address = identity_address`
For **indirect stakes**: `source_address ≠ identity_address`

### Correct Logic

```sql
-- WRONG (old behavior):
SELECT COUNT(*), SUM(amount_sats)
FROM staking_rewards
WHERE identity_address = 'i...'

-- CORRECT (new behavior):
SELECT COUNT(*), SUM(amount_sats)
FROM staking_rewards
WHERE identity_address = 'i...'
AND source_address = identity_address
```

## Prevention

All future statistics calculations now include the correct filter. The following patterns have been updated:

1. ✅ SQL scripts use `WHERE sr.source_address = sr.identity_address`
2. ✅ JavaScript queries include `AND source_address = identity_address`
3. ✅ Admin APIs validate the filter is present

## Questions?

If you see unexpected results after the fix:

1. Check if the VerusID was receiving delegated rewards (this is expected)
2. Verify the `staking_rewards` table has correct `source_address` data
3. Re-run the migration script to ensure clean recalculation

## Date Fixed

**October 28, 2025**

---

**Status**: ✅ FIXED - All statistics calculation queries updated and migration script created
