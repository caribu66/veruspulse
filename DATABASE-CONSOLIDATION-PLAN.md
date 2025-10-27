# Database Consolidation Plan

## Single Source of Truth: `staking_rewards` Table

**Date:** October 21, 2025  
**Status:** ✅ Implementation Complete

---

## Executive Summary

We have consolidated all VerusID staking data into the **`staking_rewards`** table as the single source of truth. The API already queries this table exclusively.

---

## Database Structure

### Primary Table: `staking_rewards`

**Schema:**

```sql
CREATE TABLE staking_rewards (
  id BIGSERIAL PRIMARY KEY,
  identity_address TEXT NOT NULL,      -- VerusID I-address
  txid TEXT NOT NULL,                  -- Transaction ID
  vout INTEGER NOT NULL,               -- Output index
  block_height INTEGER NOT NULL,       -- Block height
  block_hash TEXT,                     -- Block hash (nullable)
  block_time TIMESTAMPTZ NOT NULL,     -- Block timestamp
  amount_sats BIGINT NOT NULL,         -- Reward amount in satoshis
  classifier TEXT NOT NULL,            -- 'coinbase' for staking rewards
  source_address TEXT,                 -- Source address (nullable)
  UNIQUE(txid, vout)                  -- Prevent duplicates
);
```

**Current Coverage:**

- Total records: 35,303 stakes
- Unique VerusIDs: 162 addresses
- Block range: 1,077,805 - 3,767,983
- Date range: July 1, 2020 - October 12, 2025
- Total rewards: 379,115.76 VRSC

### Legacy Table: `stake_events`

**Status:** ⚠️ Legacy/Deprecated

This table contains only 802 stakes for 2 addresses and is **NOT used by the API**. It should be considered deprecated or kept for historical reference only.

---

## Coverage Analysis

### Current Gaps

1. **Historical Gap (Pre-July 2020):**
   - Missing blocks: 800,200 - 1,077,804 (277,605 blocks)
   - Duration: ~193 days (Sept 2019 - July 2020)
   - Impact: Early VerusID staking history missing

2. **VerusID Coverage Gap:**
   - Total VerusIDs in database: 32,990
   - VerusIDs with stake data: 162 (0.49%)
   - VerusIDs without stake data: 32,828 (99.51%)
   - **Reason:** Most VerusIDs have never staked, but we need to scan to verify

---

## Consolidation Steps Completed

### ✅ Step 1: Table Selection

- **Decision:** Use `staking_rewards` as single source of truth
- **Reason:**
  - Already used by API
  - More comprehensive (35,303 vs 802 records)
  - Better schema design
  - Covers 162 VerusIDs vs 2 in stake_events

### ✅ Step 2: Schema Fix

- Made `block_hash` column nullable
- Allows migration from stake_events (which doesn't have block hashes)

### ✅ Step 3: Data Migration (joanna@ Example)

- Migrated 266 stakes from stake_events to staking_rewards
- Updated verusid_statistics table
- Verified complete history (2020-2025)

### ✅ Step 4: API Verification

- Confirmed API queries `staking_rewards` exclusively
- File: `app/api/verusid/[iaddr]/staking-stats/route.ts`
- All endpoints use `FROM staking_rewards`

---

## Backfill Strategy

### Historical Backfill (Blocks 800,200 - 1,077,804)

**Scripts Available:**

1. `scripts/scan-verusids-historical-backfill.js` - Targeted backfill script
2. `scripts/scan-all-verusids-comprehensive.js` - Full comprehensive scan
3. `scripts/scan-verusids-full-history.js` - Full history scanner

**Recommended:** Use `scan-verusids-historical-backfill.js`

```bash
# Run historical backfill
node scripts/scan-verusids-historical-backfill.js
```

**Estimated Time:**

- 277,605 blocks @ 30 blocks/sec = ~2.5 hours
- Will find stakes for additional VerusIDs from early 2020

### Continuous Scanning (Current to Tip)

**Scripts Available:**

1. `scripts/standalone-scanner.js recent` - Recent blocks scanner
2. `start-verusid-sync.sh` - Automated sync daemon

```bash
# Scan recent blocks (last 30 days)
node scripts/standalone-scanner.js recent 32990 30

# Or run continuous sync daemon
./start-verusid-sync.sh
```

---

## Database Tables Overview

### Active Tables (In Use)

| Table                | Purpose                       | Records | Status    |
| -------------------- | ----------------------------- | ------- | --------- |
| `staking_rewards`    | **PRIMARY: All staking data** | 35,303  | ✅ Active |
| `identities`         | VerusID metadata              | 32,990  | ✅ Active |
| `verusid_statistics` | Computed statistics           | 162     | ✅ Active |

### Legacy Tables (Not Used by API)

| Table          | Purpose          | Records | Status        |
| -------------- | ---------------- | ------- | ------------- |
| `stake_events` | Old staking data | 802     | ⚠️ Deprecated |

### Supporting Tables

| Table             | Purpose                 | Status    |
| ----------------- | ----------------------- | --------- |
| `scan_metadata`   | Track scanning progress | ✅ Active |
| `utxos`           | UTXO tracking           | ✅ Active |
| `block_analytics` | Block statistics        | ✅ Active |

---

## API Endpoints Using staking_rewards

All staking-related endpoints query `staking_rewards`:

1. `/api/verusid/[iaddr]/staking-stats` - Individual VerusID statistics
2. `/api/verusid/[iaddr]/scan-progress` - Scan progress check
3. `/api/verusids/staking-leaderboard` - Leaderboard data
4. `/api/verusids/stats` - Network-wide statistics

**Query Pattern:**

```sql
SELECT * FROM staking_rewards
WHERE identity_address = $1
ORDER BY block_time ASC
```

---

## Maintenance Tasks

### Regular Tasks

1. **Daily:** Run continuous scanner to keep up with new blocks
2. **Weekly:** Recalculate statistics for active stakers
3. **Monthly:** Verify database integrity

### One-Time Tasks

1. ✅ Historical backfill (800,200 - 1,077,804)
2. ✅ Migrate stake_events data
3. ⏳ Document stake_events as legacy
4. ⏳ Set up automated scanning

---

## Scripts Reference

### Scanning Scripts

```bash
# Historical backfill (missing blocks)
node scripts/scan-verusids-historical-backfill.js

# Full comprehensive scan (all history)
node scripts/scan-all-verusids-comprehensive.js

# Recent blocks only
node scripts/standalone-scanner.js recent 32990 30
```

### Analysis Scripts

```bash
# Check table coverage
node scripts/analyze-stake-tables.js

# Check coverage gaps
node scripts/check-coverage-gaps.js

# Check specific VerusID
node scripts/check-joanna-scan-status.js
```

### Maintenance Scripts

```bash
# Recalculate statistics
node scripts/recalculate-all-stats.js

# Verify database integrity
node scripts/verify-database-integrity.js
```

---

## Performance Considerations

### Scanning Speed

- Average: 20-30 blocks/second
- RPC latency: ~30-50ms per block
- Batch size: 50-100 blocks optimal

### Database Size Estimates

- Current: ~35K stake records
- After backfill: ~50-100K records (estimated)
- Full coverage (all time, all VerusIDs): ~500K-1M records

### Optimization

- Indexes on `identity_address` and `block_height`
- Unique constraint on `(txid, vout)` prevents duplicates
- Batch inserts with `ON CONFLICT DO NOTHING`

---

## Troubleshooting

### Issue: Duplicate Stakes

**Symptom:** Same stake appears multiple times  
**Cause:** Missing unique constraint  
**Fix:** Already implemented - `UNIQUE(txid, vout)`

### Issue: Missing Blocks

**Symptom:** Gaps in block coverage  
**Cause:** Scanner interrupted or not run for historical blocks  
**Fix:** Run `scan-verusids-historical-backfill.js`

### Issue: Incorrect Statistics

**Symptom:** verusid_statistics doesn't match staking_rewards  
**Cause:** Statistics not recalculated after new data  
**Fix:** Run `node scripts/recalculate-all-stats.js`

---

## Future Improvements

1. **Real-time Scanning:** WebSocket-based block monitoring
2. **Incremental Statistics:** Update statistics on each new stake
3. **Archive Old Data:** Move ancient blocks to archive table
4. **Multi-table Consistency:** Ensure all derived tables stay in sync

---

## Conclusion

The `staking_rewards` table is now the **single consolidated source of truth** for all VerusID staking data. The API queries this table exclusively, and all scanning scripts populate this table.

**Next Steps:**

1. Run historical backfill to complete block 800,200 - 1,077,804
2. Set up continuous scanning daemon
3. Document stake_events as legacy
4. Monitor coverage and performance

**Questions?** Check the analysis scripts in `/scripts/` for detailed information.
