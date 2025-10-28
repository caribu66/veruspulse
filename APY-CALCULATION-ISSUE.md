# APY Calculation Issue

## Problem

Users are seeing extremely high APY values (e.g., 1000.00%) in VerusID staking statistics. This is caused by a fundamental flaw in the APY calculation formula.

### Current (Incorrect) Formula

```sql
APY = (total_rewards_VRSC / time_in_years) * 100
```

### Correct Formula

```sql
APY = (total_rewards_VRSC / staked_amount_VRSC / time_in_years) * 100
```

## Root Cause

The database only tracks **rewards** from staking, not the **actual staked balance** over time. Without knowing how much was staked, we cannot accurately calculate APY.

## Examples of the Problem

- If someone earned **100 VRSC** over **1 year**:
  - Current formula: `100 / 1 * 100 = 10,000%` ❌
  - With 10,000 VRSC staked: `100 / 10000 / 1 * 100 = 1%` ✅

- If someone earned **1000 VRSC** over **1 year**:
  - Current formula: `1000 / 1 * 100 = 100,000%` ❌
  - With 50,000 VRSC staked: `1000 / 50000 / 1 * 100 = 2%` ✅

## Solutions Implemented

### 1. Display-Level Cap (Immediate Fix)

- Modified `formatAPY()` function in `lib/utils/verusid-utils.ts`
- Caps displayed APY at 100% maximum
- Prevents showing obviously incorrect values to users

### 2. Database Recalculation (Permanent Fix)

- Created `/app/api/admin/fix-apy-calculation/route.ts`
- Estimates staked amount using conservative multiplier (20x rewards)
- Assumes ~5% baseline APY for estimation
- Caps database values at 100%

### 3. Improved Calculation Scripts

- Updated calculation formulas in:
  - `scripts/calculate-statistics-fixed.sql`
  - `scripts/FIX-CRITICAL-stake-attribution-bug.js`
  - `scripts/recalculate-apy-correctly.js`

## How to Fix Existing Data

### Option 1: Via API (Recommended)

```bash
curl -X POST https://www.veruspulse.com/api/admin/fix-apy-calculation
```

### Option 2: Via SQL Script

```bash
psql $DATABASE_URL < scripts/FIX-APY-calculation.sql
```

### Option 3: Via Node Script

```bash
node scripts/recalculate-apy-correctly.js
```

## Long-Term Solution

To calculate accurate APY in the future, we need to:

1. **Track staked balances over time** in the database
2. **Record UTXO states** and eligible staking amounts
3. **Calculate time-weighted average stake** for each period
4. Use this data in APY calculation: `rewards / avg_staked_amount / time`

This requires schema changes and enhanced scanning logic to track balance changes.

## Affected Files

- `lib/utils/verusid-utils.ts` - Display formatting
- `app/api/admin/fix-apy-calculation/route.ts` - Recalculation endpoint
- `scripts/calculate-statistics-fixed.sql` - Database calculation
- `scripts/FIX-APY-calculation.sql` - SQL fix script
- `scripts/recalculate-apy-correctly.js` - Node fix script

## References

- VerusID staking constants: `lib/models/utxo.ts`
- Statistics calculation: `lib/services/statistics-calculator.ts`
- Staking stats API: `app/api/verusid/[iaddr]/staking-stats/route.ts`
