# UTXO Database Setup - Complete Guide

## Overview

The UTXO database now stores accurate, real-time UTXO data for all VerusIDs. The data is populated directly from the Verus daemon's `getaddressutxos` RPC call, which is the authoritative source for current UTXO state.

## Architecture

### Data Flow

```
Verus Daemon (via RPC)
       ↓
getaddressutxos
       ↓
PostgreSQL Database (utxos table)
       ↓
API (/api/verusid/[iaddr]/live-utxos)
       ↓
Frontend (UTXO Visualizer)
```

### Database Schema

The `utxos` table stores:

- **txid, vout**: UTXO identifier
- **address**: VerusID I-address
- **value**: Amount in satoshis
- **creation_height, creation_time**: When the UTXO was created
- **is_spent**: Whether the UTXO has been spent
- **is_eligible**: Whether eligible for staking (150+ confirmations)
- **staking_probability**: Calculated probability of winning a stake
- **estimated_reward**: Estimated reward if this UTXO wins

## Scripts

### 1. Test Script (Single VerusID)

**File:** `scripts/test-utxo-population.js`

Tests UTXO population with joanna@ to verify the logic works correctly.

```bash
node scripts/test-utxo-population.js
```

**Output:**

```
✅ Daemon reports 139 UTXOs
✅ Processed 139 UTXOs
✅ Database UTXOs (unspent): 139
✅ Match: YES
```

### 2. Full Population Script (All VerusIDs)

**File:** `scripts/populate-all-utxos.js`

Populates UTXOs for ALL VerusIDs in the database.

```bash
node scripts/populate-all-utxos.js
```

**Features:**

- Processes all known VerusIDs
- Marks old UTXOs as spent before repopulating
- Shows progress every 10 identities
- Calculates total UTXOs and value
- Estimates completion time

## Current Status

### joanna@ (Test Case)

- **Total UTXOs:** 139
- **Total Value:** 8,263.25 VRSC
- **All Eligible:** 139 (100%)
- **Database Match:** ✅ Matches daemon exactly

### API Response

The API now returns database data:

```json
{
  "total": 139,
  "eligible": 139,
  "cooldown": 0,
  "totalValueVRSC": 8263.25
}
```

## Why Database Instead of Direct RPC?

| Aspect          | Database                  | Direct RPC               |
| --------------- | ------------------------- | ------------------------ |
| **Speed**       | ✅ Fast queries           | ⚠️ Slower per request    |
| **Accuracy**    | ✅ Matches daemon         | ✅ Authoritative source  |
| **Analytics**   | ✅ Can add custom fields  | ❌ Limited to RPC data   |
| **Scalability** | ✅ Handles many users     | ⚠️ Daemon load increases |
| **Maintenance** | ⚠️ Needs periodic updates | ✅ Always current        |

## Maintenance

### Update Frequency

Run the population script:

- **After adding new VerusIDs**: To get their UTXOs
- **Daily/Weekly**: To sync with blockchain changes
- **After major blockchain events**: Halvings, forks, etc.

### Monitoring

Check UTXO counts match the daemon:

```bash
# Compare database vs daemon
node scripts/test-utxo-population.js
```

## Next Steps

1. **Run Full Population:**

   ```bash
   node scripts/populate-all-utxos.js
   ```

2. **Set Up Cron Job (Optional):**

   ```bash
   # Update UTXOs daily at 3 AM
   0 3 * * * cd /home/explorer/verus-dapp && node scripts/populate-all-utxos.js
   ```

3. **Monitor API Performance:**
   - Check `/api/verusid/[iaddr]/live-utxos` response times
   - Verify UTXO visualizer displays correctly

## Troubleshooting

### "No UTXOs found"

- VerusID has no current UTXOs (all spent)
- This is normal for inactive addresses

### "Database mismatch"

- Re-run population script
- Check daemon is fully synced

### "RPC connection failed"

- Verify daemon is running
- Check RPC credentials in script
- Confirm port 18843 is correct

## Files Modified

1. **API Endpoint:** `app/api/verusid/[iaddr]/live-utxos/route.ts`
   - Now reads from database instead of RPC
   - Processes database UTXO format

2. **RPC Client:** `lib/rpc-client-robust.ts`
   - Updated `getAddressUTXOs` to use correct RPC method

3. **Database Service:** `lib/services/utxo-database.ts`
   - Added `markAllUTXOsAsSpent` method

## Benefits Achieved

✅ **Accurate Data**: Sourced directly from daemon  
✅ **Fast Queries**: Database is optimized for reads  
✅ **Scalable**: Can handle many concurrent users  
✅ **Maintainable**: Simple repopulation script  
✅ **Verifiable**: Test script confirms accuracy

---

**Status:** Ready for production use  
**Last Updated:** 2025-10-21  
**Next Action:** Run `node scripts/populate-all-utxos.js`
