# Tx Index Confusion: tx[0] vs tx[-1]

**Critical Issue:** Different sources give conflicting information about which transaction to use.

---

## The Contradiction

### Community Member Said:

> "The coinstake transaction (which mints the staking reward) is the **LAST transaction** in the block (`block.tx[block.tx.length - 1]`), not the first (`block.tx[0]`)."

### Oink70's Scripts Use:

| Script             | What It Does           | Transaction Used |
| ------------------ | ---------------------- | ---------------- |
| `PoS-addresses.sh` | Find staker address    | `tx[-1]` (LAST)  |
| `PoS-rewards.sh`   | Find reward addresses  | `tx[0]` (FIRST)  |
| `block-stats.sh`   | Calculate block reward | `tx[0]` (FIRST)  |

**Sources:**

- https://github.com/Oink70/Verus-CLI-tools/blob/main/PoS-addresses.sh
- https://github.com/Oink70/Verus-CLI-tools/blob/main/PoS-rewards.sh
- https://github.com/Oink70/Verus-CLI-tools/blob/main/block-stats.sh

---

## Evidence from Scripts

### PoS-addresses.sh (Line ~147):

```bash
$VERUS getblock "$c" 2 | jq -r '. |
  select(.validationtype=="stake") |
  .tx | .[-1].vout | .[0].scriptPubKey | .addresses| .[0]'
```

**Uses:** Last transaction (`tx[-1]`)  
**Gets:** Staker's address from first vout

### PoS-rewards.sh (Line ~147):

```bash
$VERUS getblock "$c" 2 | jq -r '. |
  select(.validationtype=="stake") |
  .tx | .[0].vout | .[0].scriptPubKey | .addresses| .[]'
```

**Uses:** First transaction (`tx[0]`)  
**Gets:** Reward recipient addresses

**Note:** Filters out `RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR` - a "trustless address used by the staking consensus"

### block-stats.sh (Line ~109):

```bash
$VERUS getblock "$c" 2 | jq '{
  height: .height,
  blocktype: .blocktype,
  difficulty: .difficulty,
  blockreward: [.tx[0].vout[].value] | add
}'
```

**Uses:** First transaction (`tx[0]`)  
**Gets:** Block reward by summing ALL vouts

---

## Possible Explanations

### Theory 1: Two Different Transactions

Maybe PoS blocks have BOTH transactions:

- **tx[0]**: Coinbase/reward transaction (shows where rewards go)
- **tx[-1]**: Coinstake transaction (shows who did the staking)

**Problem:** Community member said coinstake is where rewards are MINTED, not just recorded.

### Theory 2: Scripts Are For Different Use Cases

- **PoS-addresses.sh**: Identifies who staked (uses `tx[-1]`)
- **PoS-rewards.sh**: Shows where rewards went (uses `tx[0]`)
- **block-stats.sh**: Calculates total rewards (uses `tx[0]`)

**Problem:** If rewards are minted in `tx[-1]`, why does `block-stats.sh` use `tx[0]`?

### Theory 3: One of Them Is Wrong

Either:

- **A)** Oink70's scripts have bugs/inconsistencies
- **B)** Community member's explanation was incomplete
- **C)** Different conventions for different purposes

---

## What We Need to Know

### Critical Questions:

1. **Where is the reward MINTED?**
   - Is it in `tx[0]` or `tx[-1]`?

2. **What's in each transaction?**
   - What does `tx[0]` contain in a PoS block?
   - What does `tx[-1]` contain in a PoS block?

3. **How to calculate reward?**
   - Sum all vouts in `tx[0]`?
   - Sum all vouts minus inputs in `tx[-1]`?
   - Something else?

4. **Why the difference?**
   - Why do different scripts use different transactions?
   - Are they measuring different things?

---

## Testing Strategy

We need to examine an actual PoS block to see:

```bash
# Get a known PoS block
verus getblock <blockhash> 2

# Check:
1. How many transactions does it have?
2. What's in tx[0]?
3. What's in tx[-1]?
4. Which one has the staking reward?
5. Which one identifies the staker?
```

### Sample Blocks to Test:

- Block 1077805 (joanna@'s first stake, pre-halving)
- Block 2000000 (post-first-halving)
- Recent block (current era)

---

## ✅ RESOLVED - Official Explorer Confirms tx[0]

**Confidence Level:** 95% ✅

**RESOLUTION:** Verus official explorer shows that **tx[0] IS the staking reward transaction** (24 VRSC newly generated coins).

### What We Learned:

- **tx[0]** = Staking reward transaction (24 VRSC)
- **tx[-1]** = Regular transfer transaction (432 VRSC) - shows who staked
- **Our original scripts were CORRECT** using tx[0]

### Why Scripts Differ:

- `block-stats.sh` & `PoS-rewards.sh` use `tx[0]` → ✅ **CORRECT** (get reward amount)
- `PoS-addresses.sh` uses `tx[-1]` → Different purpose (find staker address)

---

## Recommendation

**PROCEED** with confidence:

1. ✅ **Our original logic was correct** - use `tx[0]` for rewards
2. ✅ **No need to change scanning scripts** - they're already right
3. ✅ **The "community feedback" was wrong** about tx[-1] being the coinstake

**Status:** READY TO PROCEED - Original scripts are correct!

---

## Questions for Community

"We found Oink70's scripts and are confused:

1. `PoS-addresses.sh` uses `tx[-1]` (last transaction) to find staker
2. `PoS-rewards.sh` uses `tx[0]` (first transaction) to find rewards
3. `block-stats.sh` uses `tx[0]` (first transaction) to calculate block rewards

This seems to contradict the earlier feedback that coinstake is the LAST transaction.

Can someone clarify:

- What's the difference between `tx[0]` and `tx[-1]` in a PoS block?
- Which transaction contains the actual staking reward?
- Why do different scripts use different transactions?

Sample block for reference: 1077805 (joanna@ stake, should be ~24 VRSC)"

---

**Status:** BLOCKED - Need clarification before proceeding.
