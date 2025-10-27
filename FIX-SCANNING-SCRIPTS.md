# Critical Fix Needed: Update All Scanning Scripts

## The Problem

**ALL our scanning scripts use INCORRECT logic** for detecting PoS rewards.

### What's Wrong:

```javascript
// ❌ WRONG - Current code in all scripts
const coinstake = block.tx[0]; // Using FIRST transaction
const reward = vout.value; // Using single vout value
```

### What's Correct:

```javascript
// ✅ CORRECT - Based on Verus community feedback
const coinstake = block.tx[block.tx.length - 1]; // LAST transaction
const reward = sum(all_vouts) - sum(all_vins); // Calculate net minted
```

---

## Scripts That Need Fixing

### 1. `scripts/scan-all-verusids-comprehensive.js`

**Line 152:** `const coinstake = block.tx[0];`  
**Line 171:** `amount: Math.round(vout.value * 100000000)`

### 2. `scripts/scan-verusids-full-history.js`

**Line 95:** `const coinstake = block.tx[0];`  
**Line ~120:** Single vout.value usage

### 3. `scripts/scan-verusids-historical-backfill.js`

**Line 104:** `const coinstake = block.tx[0];`  
**Line ~122:** Single vout.value usage

### 4. `scripts/backfill-joanna-stakes.js`

**Line ~90:** `const coinstake = block.tx[0];`  
**Line ~110:** Single vout.value usage

### 5. Any other scripts using `findStakesInBlock()`

---

## The Fix

### Change 1: Use Last Transaction

```javascript
// OLD:
const coinstake = block.tx[0];

// NEW:
const coinstake = block.tx[block.tx.length - 1];
```

### Change 2: Calculate Reward Correctly

```javascript
// OLD:
for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
  const vout = coinstake.vout[voutIdx];
  if (addresses.includes(targetAddress)) {
    amount = vout.value; // ❌ WRONG
    break;
  }
}

// NEW:
// Calculate total output to target address
let totalOutputToAddress = 0;
for (const vout of coinstake.vout) {
  if (vout.scriptPubKey?.addresses?.includes(targetAddress)) {
    totalOutputToAddress += vout.value;
  }
}

// Calculate total input FROM target address (requires fetching previous txs)
// Simplified: use block-level calculation if only one staker
const totalInputValue = await calculateTotalInputValue(coinstake);
const reward = totalOutputToAddress - totalInputValue;
```

### Challenge: Getting Input Values

To accurately calculate `sum(vins)`, we need to fetch the previous transactions that each vin references. This is expensive:

```javascript
async function calculateTotalInputValue(coinstake) {
  let totalInput = 0;

  for (const vin of coinstake.vin) {
    if (vin.coinbase) continue; // Skip coinbase

    // Fetch the previous transaction
    const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
    const prevVout = prevTx.vout[vin.vout];
    totalInput += prevVout.value;
  }

  return totalInput;
}
```

---

## Impact Assessment

### Current Data (35,303 stakes):

- ❌ **Mostly incorrect** due to wrong transaction and calculation
- ⚠️ Only 42% match expected values (by chance)
- ❌ Need to **delete and re-scan ALL data**

### Re-scan Requirements:

1. Update ALL scanning scripts
2. Delete existing staking_rewards data
3. Re-scan from block 800,200
4. Recalculate all statistics
5. Estimated time: ~5-10 hours for full scan

---

## Action Plan

### Step 1: Update Scripts (Immediate)

- [ ] Fix `scan-all-verusids-comprehensive.js`
- [ ] Fix `scan-verusids-full-history.js`
- [ ] Fix `scan-verusids-historical-backfill.js`
- [ ] Fix any other scanning scripts
- [ ] Test with a few known blocks

### Step 2: Verify Fix (Before Full Scan)

- [ ] Test with block 1077805 (should be 24 VRSC)
- [ ] Test with block from different halving periods
- [ ] Confirm reward amounts match expected schedule

### Step 3: Clear Bad Data

```sql
-- Backup current data (optional)
CREATE TABLE staking_rewards_backup AS SELECT * FROM staking_rewards;

-- Clear incorrect data
DELETE FROM staking_rewards;
DELETE FROM verusid_statistics;
```

### Step 4: Re-scan Everything

```bash
# Full historical scan with CORRECTED logic
node scripts/scan-all-verusids-comprehensive.js
```

### Step 5: Verify Results

- Check that rewards match halving schedule
- Verify no rewards < 3 VRSC (minimum after 3rd halving)
- Confirm distribution makes sense

---

## Verus Block Reward Schedule (Reference)

| Block Range           | Reward  | Era            |
| --------------------- | ------- | -------------- |
| 0 - 1,277,999         | 24 VRSC | Initial        |
| 1,278,000 - 2,329,919 | 12 VRSC | First halving  |
| 2,329,920 - 3,381,839 | 6 VRSC  | Second halving |
| 3,381,840+            | 3 VRSC  | Third halving  |

_Halvings continue approximately every 1,051,920 blocks_

---

## Testing Strategy

### Test Cases:

1. **Block 1077805** (joanna@, pre-first-halving)
   - Expected: ~24 VRSC
   - Current (wrong): 24 VRSC (happened to be right?)

2. **Block 2000000** (post-first-halving)
   - Expected: ~12 VRSC
   - Test with fixed logic

3. **Block 2500000** (post-second-halving)
   - Expected: ~6 VRSC
   - Test with fixed logic

4. **Block 3500000** (post-third-halving)
   - Expected: ~3 VRSC
   - Test with fixed logic

---

## Priority

**🚨 CRITICAL - DO NOT USE CURRENT DATA**

All existing staking_rewards data is potentially incorrect and should not be trusted until:

1. Scripts are fixed
2. Data is re-scanned
3. Results are validated

---

## Questions to Answer Before Proceeding

1. **How to handle fetching previous txs?**
   - Required for accurate input calculation
   - May slow down scanning significantly
   - Is there a faster way?

2. **Can we validate the fix?**
   - Compare with block explorer?
   - Check a few blocks manually?

3. **Should we keep backup of old data?**
   - For comparison purposes?
   - Or just delete and start fresh?

---

## Next Steps

**Immediate:**

1. Create updated scanning script with correct logic
2. Test on a few blocks
3. Verify results match expected rewards

**After verification:**

1. Update all scanning scripts
2. Clear database
3. Re-scan all data
4. Update documentation

---

**Status:** Scripts identified, fix designed, ready to implement.
