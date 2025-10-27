# Action Plan: Fix Stake Detection Logic

**Date:** October 21, 2025  
**Priority:** 🚨 CRITICAL  
**Status:** Ready to Execute

---

## Executive Summary

Based on feedback from the Verus community, **our stake detection logic is fundamentally wrong**. We need to:

1. Fix all scanning scripts
2. Delete existing (incorrect) data
3. Re-scan everything

**Estimated Impact:** ~5-10 hours of re-scanning  
**Data Loss:** ALL existing staking_rewards data (35,303 stakes) must be deleted and re-scanned

---

## What Was Wrong

### ❌ Our Current (Incorrect) Logic:

```javascript
const coinstake = block.tx[0]; // WRONG: First transaction
for (const vout of coinstake.vout) {
  if (vout.addresses.includes(target)) {
    reward = vout.value; // WRONG: Single vout value
    break;
  }
}
```

### ✅ Correct Logic (From Verus Community):

```javascript
const coinstake = block.tx[block.tx.length - 1]; // CORRECT: LAST transaction
let totalOutput = 0;
for (const vout of coinstake.vout) {
  if (vout.addresses.includes(target)) {
    totalOutput += vout.value; // Sum ALL vouts
  }
}
let totalInput = 0;
for (const vin of coinstake.vin) {
  // Fetch previous tx to get input value
  const prevTx = await getPreviousTx(vin.txid);
  totalInput += prevTx.vout[vin.vout].value;
}
const reward = totalOutput - totalInput; // CORRECT: Net minted amount
```

---

## Why This Explains Everything

### Our Suspicious Data:

- 42% were EXACTLY 12.00 VRSC ✅
- 5.8% were EXACTLY 24.00 VRSC ✅
- **But 45% were < 10 VRSC** ⚠️

### Explanation:

- The ~48% that matched expected values were **lucky coincidences** where we happened to catch the right amount
- The 45% that were too low were cases where:
  - We were looking at tx[0] instead of tx[-1]
  - We caught only part of the reward (one vout when there were multiple)
  - We were looking at an entirely wrong transaction

---

## Step-by-Step Fix Plan

### Phase 1: Backup & Documentation ✅

- [x] Document the issue (this file)
- [x] Document correct logic (`CORRECT-stake-detection-logic.js`)
- [x] Create test script (`test-correct-logic.js`)
- [ ] Backup existing data (optional)

### Phase 2: Update Scanning Scripts

- [ ] Update `scripts/scan-all-verusids-comprehensive.js`
- [ ] Update `scripts/scan-verusids-full-history.js`
- [ ] Update `scripts/scan-verusids-historical-backfill.js`
- [ ] Update `scripts/backfill-joanna-stakes.js`
- [ ] Update any other scripts using `findStakesInBlock()`

### Phase 3: Test Fix

- [ ] Test on a few known blocks (when RPC is available)
- [ ] Verify rewards match expected schedule
- [ ] Confirm no errors in logic

### Phase 4: Clear Bad Data

```sql
-- Optional: Backup
CREATE TABLE staking_rewards_backup_20251021 AS
SELECT * FROM staking_rewards;

-- Clear incorrect data
DELETE FROM staking_rewards;
DELETE FROM verusid_statistics;

-- Reset scan progress
DELETE FROM scan_metadata
WHERE scan_type LIKE '%verusid%';
```

### Phase 5: Re-scan Everything

```bash
# Run comprehensive scan with FIXED logic
node scripts/scan-all-verusids-comprehensive.js
```

### Phase 6: Verification

- [ ] Check reward distribution matches halving schedule
- [ ] Verify no rewards < 3 VRSC (unless pre-third-halving)
- [ ] Confirm median rewards are reasonable
- [ ] Spot-check a few VerusIDs manually

---

## Key Changes Required in Scripts

### Change 1: Transaction Index

```javascript
// OLD:
const coinstake = block.tx[0];

// NEW:
const coinstake = block.tx[block.tx.length - 1];
```

### Change 2: Reward Calculation

```javascript
// OLD:
for (const vout of coinstake.vout) {
  if (vout.scriptPubKey.addresses.includes(targetAddress)) {
    stakes.push({
      amount: Math.round(vout.value * 100000000),
    });
    break; // Stop at first match
  }
}

// NEW:
// Sum all outputs to target address
let totalOutput = 0;
const matchingVouts = [];

for (let i = 0; i < coinstake.vout.length; i++) {
  const vout = coinstake.vout[i];
  if (vout.scriptPubKey?.addresses?.includes(targetAddress)) {
    totalOutput += vout.value;
    matchingVouts.push(i);
  }
}

// Calculate inputs (requires fetching previous txs - see below)
const totalInput = await calculateInputValue(coinstake, targetAddress);

// Net reward
const reward = totalOutput - totalInput;

stakes.push({
  address: targetAddress,
  amount: Math.round(reward * 100000000),
  blockHeight: block.height,
  //... other fields
});
```

### Change 3: Calculate Input Values

This is the complex part - we need to fetch previous transactions:

```javascript
async function calculateInputValue(coinstake, targetAddress) {
  let totalInput = 0;

  for (const vin of coinstake.vin) {
    if (vin.coinbase) continue; // Skip coinbase (PoS has no coinbase value)

    try {
      // Fetch the previous transaction
      const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
      const prevVout = prevTx.vout[vin.vout];

      // Only count if it went to target address
      if (prevVout.scriptPubKey?.addresses?.includes(targetAddress)) {
        totalInput += prevVout.value;
      }
    } catch (error) {
      console.warn(`Could not fetch previous tx ${vin.txid}: ${error.message}`);
    }
  }

  return totalInput;
}
```

**Note:** This makes scanning slower because we need to fetch additional transactions!

---

## Expected Results After Fix

### Reward Distribution Should Be:

| Block Range           | Expected Reward | % of Total |
| --------------------- | --------------- | ---------- |
| < 1,278,000           | ~24 VRSC        | ~10-15%    |
| 1,278,000 - 2,329,920 | ~12 VRSC        | ~40-50%    |
| 2,329,920 - 3,381,840 | ~6 VRSC         | ~30-40%    |
| > 3,381,840           | ~3 VRSC         | ~5-10%     |

**No rewards should be:**

- < 3 VRSC (except fees variations)
- > 24 VRSC (except fees)
- In the suspicious 5-10 VRSC range we currently see

---

## Performance Impact

### Scanning Speed:

- **Before:** ~20-30 blocks/sec
- **After:** ~5-10 blocks/sec (due to fetching previous txs)

### Estimated Re-scan Time:

- From block 800,200 to 3,767,983 = ~2.97 million blocks
- At 10 blocks/sec = ~297,000 seconds = **~82 hours** (3.5 days)
- At 20 blocks/sec (if optimized) = **~41 hours** (1.7 days)

**Recommendation:** Run in background with `screen` or `tmux`

---

## Optimization Ideas

### 1. Cache Previous Transactions

```javascript
const txCache = new Map();

async function getCachedTx(txid) {
  if (txCache.has(txid)) {
    return txCache.get(txid);
  }
  const tx = await rpcCall('getrawtransaction', [txid, true]);
  txCache.set(txid, tx);
  return tx;
}
```

### 2. Batch RPC Calls

If possible, fetch multiple previous txs in parallel.

### 3. Progressive Scanning

Scan recent blocks first (more important), then backfill historical.

---

## Risks & Mitigation

### Risk 1: Slow Scanning

**Mitigation:** Accept the slower speed, run in background

### Risk 2: RPC Errors

**Mitigation:** Retry logic, save progress frequently

### Risk 3: Missing Previous Txs

**Mitigation:** Skip stakes where we can't fetch inputs, log for manual review

---

## Testing Checklist

Before running full re-scan:

- [ ] Test with block 1077805 (should be ~24 VRSC)
- [ ] Test with block 2000000 (should be ~12 VRSC)
- [ ] Test with block 3000000 (should be ~6 VRSC)
- [ ] Verify last tx detection works
- [ ] Verify multi-vout summing works
- [ ] Verify input calculation works

---

## Rollback Plan

If the fix doesn't work:

1. Restore from `staking_rewards_backup_20251021` table
2. Investigate further
3. Ask Verus community for more clarification

---

## Communication

### What to Tell Users:

> "We discovered an issue with our stake detection logic after consulting the Verus community. We're re-scanning all blocks with the corrected method. This will take ~1-2 days but will result in accurate staking statistics. Thank you for your patience!"

---

## Next Steps

1. **Immediate:** Update all scanning scripts with correct logic
2. **Test:** Verify with a few blocks when RPC is available
3. **Execute:** Clear database and start re-scan
4. **Monitor:** Watch progress and verify results look correct
5. **Verify:** Spot-check statistics after completion

---

## Success Criteria

✅ **Fix is successful when:**

- Median reward matches expected schedule (12 VRSC currently)
- No suspicious rewards < 3 VRSC
- Reward distribution follows halving schedule
- Manual verification of sample blocks matches our data

---

**Status:** Plan ready, awaiting script updates and execution.

**Estimated Completion:** 2-3 days after starting re-scan.
