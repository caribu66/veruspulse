# Question for Verus Community: PoS Coinstake Transaction Structure

## Context

I'm building a VerusID staking statistics tracker and need to verify that I'm correctly extracting staking rewards from PoS blocks.

## My Current Approach

For each PoS block (where `validationtype === 'stake'`), I:

1. Get the coinstake transaction (first transaction in the block, `block.tx[0]`)
2. Loop through all `vout` outputs
3. Find the first `vout` where the VerusID I-address appears in `scriptPubKey.addresses`
4. Record that `vout.value` as the staking reward amount

**Example code:**

```javascript
const coinstake = block.tx[0];
for (let i = 0; i < coinstake.vout.length; i++) {
  const vout = coinstake.vout[i];
  const addresses = vout.scriptPubKey?.addresses || [];

  if (addresses.includes(myIAddress)) {
    rewardAmount = vout.value; // Is this correct?
    break;
  }
}
```

## My Questions

### 1. Coinstake Transaction Structure

In a Verus PoS coinstake transaction:

- Which `vout` index contains the actual **staking reward**?
- Is it always a specific index (e.g., `vout[0]` or `vout[1]`)?
- Or does the structure vary by block?

### 2. Multiple Vouts

If a VerusID I-address appears in **multiple vouts** in the coinstake:

- Should I **sum all vouts** that contain the I-address?
- Or should I only use a **specific vout**?
- How do I differentiate between the reward vout and other vouts?

### 3. Reward Calculation

Is the reward amount:

- **A)** The value in a specific vout (which one?)
- **B)** Sum of all vouts containing the I-address
- **C)** Calculated as: `sum(all vouts) - sum(all vins)`
- **D)** Something else?

### 4. My Data Analysis

I've analyzed ~35,000 stakes across 162 VerusIDs using my current method:

**Results:**

- 42.5% are EXACTLY 12.00000000 VRSC ✅ (matches halved reward)
- 5.8% are EXACTLY 24.00000000 VRSC ✅ (matches pre-halving reward)
- But 45% are < 10 VRSC ⚠️ (seems too low)
- Range: 3 VRSC to 51 VRSC
- Median: 12 VRSC

**vout index distribution:**

- 86% of my recorded stakes use vout[1]
- 14% use vout[0]

**Questions:**

- Does this data suggest my method is mostly correct?
- Or am I potentially catching the wrong vout in some cases?
- Should I be using a specific vout index consistently?

## Example Block to Reference

**Block 1077805** (VerusID stake from July 2020):

- I recorded: 24.00000000 VRSC from vout[1]
- VerusID: `iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5`
- TXID: `fdb995254e22c46ebfc4d5053afdb101b8ff2bdc08cfe6acee478ee598e50f47`

Can someone verify if 24.00 VRSC is the correct reward for this block?

## What I Need

To properly track VerusID staking statistics, I need to understand:

1. **The authoritative method** to extract staking reward amounts from PoS blocks
2. **Which vout(s)** to read and why
3. **How to handle** cases where the I-address appears in multiple vouts
4. **Whether my current method** is fundamentally correct or needs changes

## Additional Context

- I'm scanning from block 800,200 (VerusID activation) to current
- Tracking all ~33,000 VerusIDs
- Building a public explorer for VerusID staking statistics
- Want to ensure accuracy before importing historical data

---

**Any guidance, documentation references, or code examples would be greatly appreciated!**

Thank you! 🙏
