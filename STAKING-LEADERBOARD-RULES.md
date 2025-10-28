# 🏆 Staking Trending Leaderboard Rules

## Updated: October 28, 2025

### ✅ **CRITICAL RULES IMPLEMENTED**

The VerusPulse staking trending leaderboard now correctly implements these rules:

## 📋 **Rule 1: Direct I-Address Stakes Only**

**Requirement:** Stakes/rewards must come from the **SAME I-address** that earned them.

- ✅ Only stakes where `source_address = identity_address` are counted
- ❌ Delegated rewards from R-addresses are excluded
- ❌ Rewards from other addresses are excluded

**Implementation:**

- All queries now filter: `WHERE source_address = identity_address`
- Affects: statistics, leaderboard, trending, rewards calculations

## ⏰ **Rule 2: Active Staking (Last 30 Days)**

**Requirement:** Must have staked within the **last 30 days**.

- ✅ Only VerusIDs with recent stakes appear in trending
- ❌ Inactive VerusIDs (>30 days) are excluded from leaderboard

**Implementation:**

```sql
WHERE last_stake_time >= NOW() - INTERVAL '30 days'
```

## 💰 **Rule 3: Only Count Own Rewards**

**Requirement:** Only rewards **earned by the same I-address** are counted.

- ✅ Rewards earned by the I-address staking directly
- ❌ Rewards received from other addresses (even if sent to the I-address)

**Example:**

- VerusID `iABC...123` stakes → earns 10 VRSC → ✅ COUNTED
- R-address `RABC...456` stakes → sends 10 VRSC to `iABC...123` → ❌ NOT COUNTED

## 📊 **Trending Score Calculation**

Trending score is based on **growth** over the last 7 days:

**Formula:** `(stake_trend × 0.4) + (reward_trend × 0.4) + (view_trend × 0.2)`

Where:

- **Stake Trend (40%)**: Increase in number of stakes
- **Reward Trend (40%)**: Increase in rewards earned
- **View Trend (20%)**: Increase in page views

**Trend Calculation:**

```
trend = ((last_7_days - previous_7_days) / previous_7_days) × 100
```

## 🎯 **How to Qualify for Trending**

1. ✅ **Stake with your I-address** (not R-addresses)
2. ✅ **Stake within last 30 days** (stay active)
3. ✅ **Increase staking activity** (more stakes than previous week)
4. ✅ **Grow your rewards** (more rewards than previous week)

## 🚫 **Why Some VerusIDs Don't Appear**

Common reasons:

- ❌ Haven't staked in 30+ days (inactive)
- ❌ Only receiving delegated rewards (not direct I-address stakes)
- ❌ Declining activity (fewer stakes than previous week)
- ❌ No stakes at all (below minimum threshold)

## 📈 **Files Updated with Correct Filters**

All the following files now correctly filter for `source_address = identity_address`:

### Statistics Calculation:

- ✅ `scripts/calculate-statistics.sql`
- ✅ `scripts/calculate-statistics-fixed.sql`
- ✅ `scripts/recalculate-all-stats.js`
- ✅ `scripts/FIX-CRITICAL-stake-attribution-bug.js`

### Admin API Endpoints:

- ✅ `app/api/admin/recalculate-statistics/route.ts`
- ✅ `app/api/admin/simple-recalculate/route.ts`
- ✅ `app/api/admin/remove-duplicates/route.ts`
- ✅ `app/api/admin/fix-corrupted-data/route.ts`
- ✅ `app/api/admin/cleanup-corrupted-rewards/route.ts`

### Leaderboard & Trending:

- ✅ `app/api/verusids/staking-leaderboard/route.ts`
- ✅ `lib/database/analytics-schema.sql` (trend calculations)
- ✅ `lib/services/trend-calculation-service.ts`
- ✅ `lib/services/priority-verusid-scanner.ts`
- ✅ `lib/verusid-cache.ts`

### Display:

- ✅ `app/api/verusid/[iaddr]/staking-stats/route.ts` (time-series data)
- ✅ `components/trending-section.tsx`

## 🔍 **Verification**

After the October 28, 2025 fix:

- **Before:** 298,060 total stakes (including incorrect delegated rewards)
- **After:** 261,231 direct I-address stakes
- **Removed:** 36,829 incorrect stake attributions (12.4%)

**Example:** VerusID `iDhAAg4dXUkuBbxgdP3RKveCr1gvu8o7Vg`

- **Before:** 36,853 stakes (99.9% incorrect)
- **After:** 24 stakes (only direct I-address stakes)
- **Fixed:** Removed 36,829 delegated rewards

## 📝 **Summary**

The VerusPulse staking trending leaderboard now **correctly** implements all three critical rules:

1. ✅ Only direct I-address stakes are counted
2. ✅ Must have staked in the last 30 days
3. ✅ Only rewards earned by the same I-address are counted

This ensures fair and accurate representation of actual staking activity on the Verus network.

---

**Last Updated:** October 28, 2025  
**Migration Script:** `scripts/FIX-CRITICAL-stake-attribution-bug.js`  
**Status:** ✅ FULLY IMPLEMENTED
