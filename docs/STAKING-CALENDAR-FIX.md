# Staking Calendar Missing Stakes - Root Cause & Fix

## Problem Description

When viewing the Staking Activity Calendar for a VerusID that has been staking for years, the calendar shows lots of missing stakes even though the identity has been staking consistently.

## Example Case: caribu66@

**Symptoms:**

- Calendar shows scattered green blocks with many gaps
- User reports staking every month for 5 years
- Visual inspection shows the calendar is missing most stakes

**Investigation Results:**

```
I-address: iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB
Stakes in DB: 981 records
Expected: ~1,825 stakes (5 years × 365 days)
Coverage: Only 39% of expected data
```

## Root Cause

**Data Corruption: All stake records have `block_height = 0`**

When examining the database:

```sql
SELECT block_height, block_time, amount_sats, txid
FROM staking_rewards
WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
LIMIT 10;
```

Results showed:

```
 block_height |       block_time       | amount_sats |        txid
--------------+------------------------+-------------+-----------------
            0 | 2025-10-23 19:05:09+01 |   304063250 | 633187105a...
            0 | 2025-08-28 22:29:15+01 |   303742997 | ad167e814d...
            0 | 2025-07-30 10:21:35+01 |   305331705 | 8b0336272c...
```

**All records have `block_height = 0`** instead of actual block numbers!

### Why This Happens

1. **Incorrect Data Import**: Data was imported using a method that didn't properly capture block heights
2. **Default Value Corruption**: Some scanning process used `0` as a default/placeholder
3. **Schema Migration Issue**: Possible migration that didn't backfill block heights properly

### Impact

- **Calendar Display**: Cannot organize stakes properly by blockchain sequence
- **Time Calculation**: Cannot determine proper stake timing
- **Gap Detection**: System can't identify real vs. missing data
- **Statistics**: APY and frequency calculations are affected

## The Fix

### For caribu66@ (Specific Case)

Run the provided fix script:

```bash
./scripts/fix-caribu66-stakes.sh
```

This script will:

1. Backup corrupted data
2. Delete records with `block_height = 0`
3. Rescan the entire blockchain history for the I-address
4. Recalculate statistics
5. Verify results

### Manual Fix (Any VerusID)

```bash
# 1. Get the I-address
IADDR="<identity-i-address>"

# 2. Backup corrupted data
psql $DATABASE_URL -c "\COPY (SELECT * FROM staking_rewards WHERE identity_address = '$IADDR') TO 'backup.sql'"

# 3. Delete corrupted data
psql $DATABASE_URL -c "DELETE FROM staking_rewards WHERE identity_address = '$IADDR' AND block_height = 0"

# 4. Rescan blockchain
node scripts/scan-single-verusid-complete.js "$IADDR"

# 5. Recalculate statistics
node scripts/calculate-verusid-statistics.js "$IADDR"
```

## Prevention

### 1. Validate Block Heights on Insert

Update all scanning scripts to validate `block_height > 0`:

```javascript
if (!block || !block.height || block.height <= 0) {
  console.error(`Invalid block height: ${block.height}`);
  return;
}
```

### 2. Database Constraints

Add a check constraint to prevent `block_height = 0`:

```sql
ALTER TABLE staking_rewards
ADD CONSTRAINT block_height_positive
CHECK (block_height > 0);
```

### 3. Data Validation Query

Regular check for corrupted data:

```sql
-- Find all identities with corrupted data
SELECT
    identity_address,
    COUNT(*) as corrupted_records
FROM staking_rewards
WHERE block_height = 0
   OR block_height IS NULL
GROUP BY identity_address;
```

### 4. Proper Scanning [[memory:9807383]]

**CRITICAL**: Always scan ONLY the I-address (identityaddress), NOT R-addresses:

✅ **Correct**: Scan `iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB`  
❌ **Wrong**: Don't scan R-addresses from `primaryaddresses`

The correct method:

1. Scan blocks for PoS blocks (`blocktype: "minted"`)
2. Check if the coinstake (first transaction) pays to the I-address
3. **IGNORE R-addresses completely**

Mixing I-address stakes with R-address stakes will return incorrect data!

## Verification After Fix

Run this query to verify the fix worked:

```sql
SELECT
    identity_address,
    COUNT(*) as total_stakes,
    MIN(block_height) as first_block,
    MAX(block_height) as last_block,
    COUNT(DISTINCT DATE(block_time)) as days_with_stakes,
    MIN(DATE(block_time)) as first_date,
    MAX(DATE(block_time)) as last_date
FROM staking_rewards
WHERE identity_address = '<I-ADDRESS>'
  AND block_height > 0
GROUP BY identity_address;
```

Expected results:

- `first_block` and `last_block` should be realistic block numbers (> 800,200)
- `days_with_stakes` should be reasonable for the staking period
- `first_date` should match when staking started
- No records with `block_height = 0` should exist

## Component Relationships

### Data Flow:

```
Blockchain (RPC)
    ↓
Scanning Scripts (scan-single-verusid-complete.js)
    ↓
Database (staking_rewards table)
    ↓
API Endpoint (/api/verusid/[iaddr]/staking-stats/route.ts)
    ↓
Dashboard Component (verusid-staking-dashboard.tsx)
    ↓
Calendar Component (charts/heatmap-calendar.tsx)
```

### Files Involved:

1. **Database Schema**: `db/migrations/20251013_create_verusid_tables.sql`
   - `staking_rewards` table structure

2. **Scanning Scripts**:
   - `scripts/scan-single-verusid-complete.js` ← Main scanner
   - `lib/services/priority-verusid-scanner.ts`
   - `scripts/scan-all-verusids-for-stakes.js`

3. **API Layer**:
   - `app/api/verusid/[iaddr]/staking-stats/route.ts` ← Fetches daily data

4. **Frontend Components**:
   - `components/verusid-staking-dashboard.tsx` ← Uses dailyData
   - `components/charts/heatmap-calendar.tsx` ← Displays calendar

5. **Data Query** (lines 162-185 in staking-stats route):

```typescript
const dailyQuery = `
  SELECT 
    DATE(block_time) as stake_date,
    COUNT(DISTINCT block_height) as stake_count,
    SUM(amount_sats) as total_rewards_satoshis,
    MIN(block_time) as period_min,
    MAX(block_time) as period_max
  FROM staking_rewards
  WHERE identity_address = $1
  GROUP BY DATE(block_time)
  ORDER BY stake_date ASC
`;
```

## Summary

**Problem**: Staking calendar shows missing stakes  
**Root Cause**: Database records have `block_height = 0` (corrupted data)  
**Solution**: Delete corrupted data and rescan blockchain  
**Prevention**: Add validation, constraints, and regular audits

The calendar component itself is working correctly - it's a **data quality issue** that needs to be fixed at the scanning/database level.
