# Quick Start: Integrated Scanner

## What It Does

The integrated scanner (`scripts/scan-all-verusids-integrated.js`) is your ONE-STOP solution for:

1. ✅ **Scanning for staking rewards** (last N days)
2. ✅ **Updating UTXO database** (current state for all VerusIDs)

## Quick Commands

### Run Now (Scan Last 30 Days)

```bash
node scripts/scan-all-verusids-integrated.js
```

### Run Now (Scan Last 7 Days) - Faster!

```bash
node scripts/scan-all-verusids-integrated.js 7
```

### After Scanning, Update Statistics

```bash
./scripts/update-statistics.sh
```

## What You'll See

```
╔═══════════════════════════════════════════════════════════╗
║   Integrated VerusID Scanner: Stakes + UTXOs             ║
╚═══════════════════════════════════════════════════════════╝

📋 Loading VerusIDs from database...
✅ Found 32,990 VerusIDs

⛓️  Getting blockchain height...
✅ Current height: 3,322,036

═══════════════════════════════════════════════════════════
PHASE 1: SCANNING FOR STAKING REWARDS
═══════════════════════════════════════════════════════════

📊 Progress: 600 blocks (41.6%) | Stakes: 134 | Rate: 5.2 blk/s | ETA: 3min

═══════════════════════════════════════════════════════════
PHASE 2: UPDATING UTXO DATABASE
═══════════════════════════════════════════════════════════

💾 UTXO Progress: 1234/32990 (3.7%) | UTXOs: 45,678
```

## Expected Time

| Days    | Blocks  | Approx Time |
| ------- | ------- | ----------- |
| 1 day   | 1,440   | ~5-10 min   |
| 7 days  | 10,080  | ~30-60 min  |
| 30 days | 43,200  | ~2-4 hours  |
| 90 days | 129,600 | ~6-12 hours |

Plus ~5-10 minutes for UTXO update (all 32,990 VerusIDs)

## Current Status

✅ **Script Created**: `scripts/scan-all-verusids-integrated.js`  
✅ **Tested**: Successfully scanning and finding stakes  
✅ **Database Schema**: Correct column names (`amount_sats`, etc.)  
✅ **Ready to Use**: Run now!

## Recommended Workflow

### Daily Run (Scheduled)

```bash
# Add to crontab (runs at 3 AM daily)
0 3 * * * cd /home/explorer/verus-dapp && node scripts/scan-all-verusids-integrated.js 7 && ./scripts/update-statistics.sh
```

### Manual Run (When Needed)

```bash
# Full scan
node scripts/scan-all-verusids-integrated.js 30
./scripts/update-statistics.sh

# Quick scan
node scripts/scan-all-verusids-integrated.js 7
./scripts/update-statistics.sh
```

## What Gets Updated

### 1. `staking_rewards` Table

- Historical staking rewards for all VerusIDs
- Block heights, timestamps, amounts
- Used for analytics, charts, statistics

### 2. `utxos` Table

- Current UTXO state for all VerusIDs
- Unspent outputs, values, eligibility
- Used for UTXO visualizer, staking health

### 3. `verusid_statistics` Table (via update-statistics.sh)

- Aggregated metrics (total rewards, APY, etc.)
- Best/worst months
- Calculated after scanning

## Benefits vs Old Approach

| Feature         | Old (2 scripts)        | New (integrated)       |
| --------------- | ---------------------- | ---------------------- |
| **Commands**    | 2 separate             | 1 combined             |
| **Time**        | ~70 min                | ~65 min                |
| **Consistency** | Can drift              | Always synced          |
| **Maintenance** | Complex                | Simple                 |
| **Errors**      | More points of failure | Unified error handling |

## Troubleshooting

### Slow Performance?

- Use shorter time range: `node scripts/scan-all-verusids-integrated.js 7`
- Ensure daemon is fully synced
- Check system resources

### No Stakes Found?

- Normal if very short time period
- Try longer: `node scripts/scan-all-verusids-integrated.js 30`

### UTXO Errors?

- Usually transient
- Rerun the script
- Check daemon connection

## Next Steps

1. **Run the integrated scanner:**

   ```bash
   node scripts/scan-all-verusids-integrated.js 7
   ```

2. **Wait for completion** (~30-60 minutes for 7 days)

3. **Update statistics:**

   ```bash
   ./scripts/update-statistics.sh
   ```

4. **Check your dashboard** - All data should be accurate!

---

**Status:** ✅ Ready for Production  
**Last Updated:** 2025-10-21  
**Test Status:** ✅ Successfully finding stakes and updating UTXOs
