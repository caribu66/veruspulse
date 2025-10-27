# Stake Detection Logic - Needs Verification

**Date:** October 21, 2025  
**Status:** ⚠️ UNCERTAIN - Needs Expert Review

---

## Issue Summary

The stake scanning scripts may not be correctly identifying the staking reward amount. Analysis of recorded data shows:

### Data Analysis Results

**For joanna@ (308 stakes):**

- Min: 3.01 VRSC (too low?)
- Max: 51.86 VRSC
- Avg: 9.83 VRSC
- Median: 12.00 VRSC

**Distribution:**

- 11.4% are < 5 VRSC ⚠️
- 34.1% are 5-10 VRSC ⚠️
- 48.1% are 12-15 VRSC ✅ (expected after halving)
- 6.2% are 24-25 VRSC ✅ (expected before halving)

**Exact matches:**

- 42.5% are EXACTLY 12.00000000 VRSC ✅
- 5.8% are EXACTLY 24.00000000 VRSC ✅

**vout inconsistency:**

- 86.4% use vout[1]
- 13.6% use vout[0] ⚠️

---

## Current Detection Logic

```javascript
// From: scripts/scan-all-verusids-comprehensive.js

function findStakesInBlock(block, targetAddresses) {
  // 1. Check if PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';

  // 2. Get coinstake transaction (first tx)
  const coinstake = block.tx[0];

  // 3. Loop through ALL vouts
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];

    // 4. For each address in the vout
    for (const addr of vout.scriptPubKey.addresses) {
      // 5. If it matches our I-address, record THIS vout's value
      if (targetAddresses.has(addr) && !addressesFoundInBlock.has(addr)) {
        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000), // ← IS THIS CORRECT?
        });
        addressesFoundInBlock.add(addr); // One per block
      }
    }
  }
}
```

---

## The Questions

### ❓ Question 1: Which vout contains the reward?

In a Verus PoS coinstake transaction:

- Is the reward in a SPECIFIC vout index?
- Or do we need to SUM all vouts that go to the I-address?
- Or is it `total_output - total_input`?

### ❓ Question 2: Why the variation?

Expected rewards:

- Before halving: 24 VRSC
- After halving: 12 VRSC

But we're seeing:

- 11% < 5 VRSC
- 34% in 5-10 VRSC range

**Possible explanations:**

1. Transaction fees varying the amount?
2. Block time adjustments?
3. We're recording the wrong vout?
4. Multiple vouts and we should sum them?

### ❓ Question 3: Why different vouts?

- 86% use vout[1]
- 14% use vout[0]

**Possible explanations:**

1. Different block structures over time?
2. The script is finding different vouts first?
3. vout[0] vs vout[1] have different meanings?

---

## What We Know

### ✅ Definitely Correct:

1. We're scanning I-addresses only (not R-addresses) [[memory]]
2. We're checking PoS blocks correctly (validationtype === 'stake')
3. We're using the coinstake transaction (first tx in block)
4. We're recording ONE stake per block per address (not multiple)
5. We're NOT recording full UTXO values (max is 72 VRSC, not 1000+)

### ⚠️ Uncertain:

1. Are we capturing the correct reward amount?
2. Should we use a specific vout index?
3. Should we sum multiple vouts for the same address?

---

## Comparison with stake_events Table

The `stake_events` table (legacy) shows:

- joanna@: 266 stakes
- Rewards stored differently

**Question:** Does stake_events have the correct amounts? Can we compare?

---

## Recommended Actions

### 1. Verify with Block Explorer

Check a few known stakes on a block explorer:

- Block 1077805 (joanna@'s first stake)
- Compare our recorded 24.00 VRSC
- Does the explorer show the same amount?

### 2. Check Verus Documentation

Research Verus PoS coinstake transaction structure:

- Official documentation
- GitHub issues
- Discord/community forums

### 3. Compare with Other Scanners

Check if there are other Verus blockchain scanners:

- How do they calculate staking rewards?
- Do they use the same logic?

### 4. Test with Known Data

For VerusIDs with known total rewards:

- Do our totals match?
- Are we significantly over/under?

---

## Impact Assessment

### If Detection is CORRECT:

- ✅ All data is accurate
- ✅ Continue as planned
- ✅ Run historical backfill

### If Detection is INCORRECT:

- ⚠️ Need to update scanning logic
- ⚠️ Re-scan all blocks
- ⚠️ Recalculate all statistics
- ⚠️ Could affect ~35,000 stakes across 162 VerusIDs

---

## Data Quality Indicators

**Signs the detection might be CORRECT:**

- 48% of rewards are in the expected 12-15 VRSC range
- 42.5% are EXACTLY 12.00000000 VRSC
- Max is reasonable (72 VRSC, not thousands)
- Median matches expected (12 VRSC)

**Signs the detection might be WRONG:**

- 45% of rewards are < 10 VRSC (seems too low)
- Wide variation (3 - 51 VRSC)
- vout index inconsistency (0 vs 1)

---

## Temporary Conclusion

**The detection logic is PROBABLY MOSTLY CORRECT** but:

- Some rewards might be captured incorrectly
- The variation suggests edge cases we're not handling
- Need expert verification before proceeding with historical backfill

**Confidence Level:** 70% correct, 30% uncertain

---

## Next Steps

1. **DO NOT run historical backfill yet** until verified
2. Research Verus PoS transaction structure
3. Verify a few blocks manually
4. Compare with block explorer data
5. Consult Verus community if needed

---

## Files to Review

- `scripts/scan-all-verusids-comprehensive.js` (line 142-185)
- `scripts/scan-verusids-full-history.js` (line 84-125)
- `scripts/scan-verusids-historical-backfill.js` (line 93-134)

All use the same `findStakesInBlock` logic.

---

**Status:** Investigation ongoing. Do not trust the data 100% until verified.
