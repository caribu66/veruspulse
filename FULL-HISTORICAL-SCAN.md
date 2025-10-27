# Full Historical Scan - Block 800200 to Current Tip

## Overview

The **Full Historical Scanner** (`scripts/scan-full-history-integrated.js`) is a ONE-TIME comprehensive scan that captures:

1. ✅ **ALL staking rewards** from VerusID activation (block 800200) to current blockchain tip
2. ✅ **Current UTXO state** for all VerusIDs

This is the **initial population** script. After it completes, use the daily scanner for incremental updates.

## When to Use

### Use This Script If:

- ✅ First time setting up the database
- ✅ Need complete historical data
- ✅ Database was corrupted and needs rebuild
- ✅ Want to backfill missing historical data

### Don't Use This Script If:

- ❌ Database already has recent data (use `scan-all-verusids-integrated.js` instead)
- ❌ Just need to update last few days/weeks
- ❌ Looking for quick incremental updates

## Key Features

### 1. Resume Capability

- Saves progress every 1,000 blocks
- Can resume if interrupted
- Progress saved to `scan-progress.json`

### 2. Comprehensive Coverage

- Scans from block **800200** (VerusID activation)
- Goes to current blockchain tip
- Captures ~2.5 million blocks

### 3. Efficient Processing

- Batch processing (100 blocks at a time)
- Optimized RPC calls
- Real-time progress tracking

### 4. Error Resilience

- Continues on block errors
- Tracks error count
- Saves checkpoint before failure

## Estimated Time

Based on ~5 blocks/second scan rate:

| Blocks    | Time                     |
| --------- | ------------------------ |
| 100,000   | ~5.5 hours               |
| 500,000   | ~27.8 hours              |
| 1,000,000 | ~55.6 hours              |
| 2,500,000 | **~139 hours (~6 days)** |

**Current scan (800200 to ~3,320,000):** ~140 hours (~6 days)

Plus ~10-30 minutes for UTXO update.

## Usage

### Start the Scan

```bash
node scripts/scan-full-history-integrated.js
```

### If Interrupted, Resume

Just run the same command again:

```bash
node scripts/scan-full-history-integrated.js
```

It will automatically resume from the last checkpoint.

### Run in Background (Recommended)

```bash
# Run in screen
screen -S verus-scan
node scripts/scan-full-history-integrated.js

# Detach: Ctrl+A, D
# Reattach: screen -r verus-scan
```

Or with nohup:

```bash
nohup node scripts/scan-full-history-integrated.js > scan.log 2>&1 &

# Monitor progress:
tail -f scan.log
```

## Output Example

```
╔═══════════════════════════════════════════════════════════╗
║   FULL HISTORICAL SCAN: Block 800200 → Current Tip       ║
╚═══════════════════════════════════════════════════════════╝

📋 Loading VerusIDs from database...
✅ Found 32,990 VerusIDs

⛓️  Getting blockchain height...
✅ Current height: 3,320,000

═══════════════════════════════════════════════════════════
SCAN CONFIGURATION
═══════════════════════════════════════════════════════════
   Start block: 800200
   End block: 3,320,000
   Total blocks: 2,519,800
   VerusIDs: 32,990
   Estimated time: ~139.9 hours
   Progress saved every 1000 blocks
═══════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════╗
║   PHASE 1: HISTORICAL STAKE SCAN                          ║
╚═══════════════════════════════════════════════════════════╝

📊 Block 850200/3320000 (1.98%) | Stakes: 15,234 | Rate: 5.2 blk/s | ETA: 131.5h (7890min) | Checkpoint: 850000
```

## Progress Checkpoints

The scan saves progress every 1,000 blocks to `scan-progress.json`:

```json
{
  "lastScannedBlock": 850000,
  "timestamp": "2025-10-21T15:30:00.000Z",
  "stats": {
    "blocksScanned": 50000,
    "stakeEventsFound": 15234,
    "errors": 3
  }
}
```

## What Gets Populated

### 1. `staking_rewards` Table

Complete historical staking rewards:

- Block 800200 → Current tip
- All VerusIDs
- Exact reward amounts
- Block timestamps

### 2. `utxos` Table

Current UTXO state:

- All VerusIDs
- Unspent outputs
- Eligibility status
- Value in satoshis

## After Completion

### 1. Update Statistics

```bash
./scripts/update-statistics.sh
```

This calculates:

- Total rewards per VerusID
- APY, ROI
- Best/worst months
- Aggregated metrics

### 2. Switch to Daily Scanner

For ongoing updates:

```bash
# Daily (recommended)
node scripts/scan-all-verusids-integrated.js 7

# Or set up cron:
0 3 * * * cd /home/explorer/verus-dapp && node scripts/scan-all-verusids-integrated.js 7 && ./scripts/update-statistics.sh
```

## Monitoring

### Check Progress

```bash
# View progress file
cat scan-progress.json

# Monitor in real-time (if running in background)
tail -f scan.log

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM staking_rewards;"
```

### Estimated Completion

The script shows real-time ETA based on current scan rate.

## Troubleshooting

### Scan Too Slow?

- **Normal:** 4-6 blocks/second is expected
- **Check:** Ensure daemon is fully synced
- **Optimize:** Run on same machine as daemon
- **Consider:** May take 5-7 days for full history

### Progress Not Saving?

- Check file permissions in project directory
- Verify `scan-progress.json` is being created
- Check disk space

### RPC Errors?

- Daemon may be under heavy load
- Script will retry automatically
- Check daemon logs if persistent

### Out of Memory?

- Batch size is already optimized (100 blocks)
- Ensure system has adequate RAM
- Monitor with `htop` or `top`

### Need to Stop?

```bash
# Find process
ps aux | grep scan-full-history

# Stop gracefully (Ctrl+C)
# Or kill process
kill <PID>

# Resume later by running script again
node scripts/scan-full-history-integrated.js
```

## Performance Optimization

### Recommended Setup

1. **Run on same server as daemon** - Reduces network latency
2. **Use screen or tmux** - Prevents interruption
3. **Monitor system resources** - Ensure adequate CPU/RAM
4. **Check daemon health** - Should be fully synced

### Expected Performance

- **Scan rate:** 4-6 blocks/second
- **Memory usage:** ~200-500 MB
- **CPU usage:** Moderate (daemon does most work)
- **Disk I/O:** Moderate (database writes)

## Files Created

- **`scan-progress.json`** - Progress checkpoint (deleted on completion)
- **`scan.log`** - Output log (if using nohup)

## Comparison: Historical vs Daily

### Historical Scanner (This Script)

- **Use:** ONE-TIME initial population
- **Scope:** Block 800200 → Current tip (~2.5M blocks)
- **Time:** ~6 days
- **Frequency:** Once, or after data loss

### Daily Scanner

- **Use:** ONGOING incremental updates
- **Scope:** Last 7-30 days (~10K-43K blocks)
- **Time:** 30-120 minutes
- **Frequency:** Daily via cron

## Ready to Start?

### Quick Start

```bash
# In screen (recommended)
screen -S verus-scan
node scripts/scan-full-history-integrated.js

# Detach: Ctrl+A, D
# Check later: screen -r verus-scan
```

### Or Background

```bash
nohup node scripts/scan-full-history-integrated.js > scan.log 2>&1 &
tail -f scan.log
```

---

**Status:** ✅ Ready for Production  
**Estimated Duration:** ~6 days for full history  
**Next Action:** `node scripts/scan-full-history-integrated.js`  
**After Completion:** Run `./scripts/update-statistics.sh`
