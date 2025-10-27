# Quick Start: Database Backfill & Continuous Scanning

## Overview

You now have ONE consolidated database table: **`staking_rewards`**

This guide shows you how to fill it with complete historical data.

---

## Current Status ✅

- ✅ **staking_rewards** is the single source of truth
- ✅ API queries staking_rewards exclusively
- ✅ 35,303 stakes for 162 VerusIDs already in database
- ✅ Coverage: Block 1,077,805 to 3,767,983 (July 2020 - Oct 2025)
- ⚠️ **Missing:** Blocks 800,200 - 1,077,804 (early 2020)

---

## Step 1: Run Historical Backfill

Scan the missing 277,605 blocks from early 2020:

```bash
# Navigate to project directory
cd /home/explorer/verus-dapp

# Run historical backfill
node scripts/scan-verusids-historical-backfill.js
```

**What it does:**

- Scans blocks 800,200 - 1,077,804
- Checks all 32,990 VerusIDs for stakes
- Adds found stakes to staking_rewards table
- Saves progress every 1,000 blocks (can resume if interrupted)

**Estimated Time:** ~2.5 hours @ 30 blocks/second

**Progress indicators:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: 45.2% (Block 925,000/1,077,804)
Stakes: 1,234 found
Speed: 28.3 blocks/sec
ETA: 1.2 hours (72 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 2: Verify Completion

After backfill completes, verify the data:

```bash
# Check coverage
node scripts/check-coverage-gaps.js
```

**Expected result:**

```
✅ Complete coverage from VerusID activation!
   VerusID activation block: 800,200
   First stake in database: 800,200  <-- Should match!
```

---

## Step 3: Set Up Continuous Scanning

Keep the database up-to-date with new blocks:

### Option A: Run Manually (Development)

```bash
# Scan last 30 days
node scripts/standalone-scanner.js recent 32990 30
```

### Option B: Automated Daemon (Production)

```bash
# Start continuous sync daemon
./start-verusid-sync.sh
```

This runs in the background and:

- Scans new blocks every 5 minutes
- Updates staking_rewards automatically
- Logs progress to `logs/verusid-sync.log`

---

## Step 4: Recalculate Statistics

Update the statistics for all VerusIDs after backfill:

```bash
# Recalculate all statistics
node scripts/recalculate-all-stats.js
```

This updates the `verusid_statistics` table with:

- Total stakes
- Total rewards
- APY calculations
- First/last stake times

---

## Running in Background

For long-running scans, use `screen` or `tmux`:

### Using screen:

```bash
# Start a screen session
screen -S backfill

# Run the backfill
node scripts/scan-verusids-historical-backfill.js

# Detach: Press Ctrl+A, then D
# Reattach later: screen -r backfill
```

### Using tmux:

```bash
# Start tmux session
tmux new -s backfill

# Run the backfill
node scripts/scan-verusids-historical-backfill.js

# Detach: Press Ctrl+B, then D
# Reattach later: tmux attach -t backfill
```

---

## Monitoring Progress

### Check database size:

```bash
node scripts/analyze-stake-tables.js
```

### Check specific VerusID:

```bash
# Modify the script to check any VerusID
node scripts/check-joanna-scan-status.js
```

### Check scan metadata:

```sql
SELECT * FROM scan_metadata
WHERE scan_type = 'historical_backfill'
ORDER BY last_updated DESC;
```

---

## Troubleshooting

### Issue: "Connection refused" to RPC

**Fix:** Make sure Verus daemon is running

```bash
# Check if verusd is running
ps aux | grep verusd

# Check RPC connection
curl --user verus:verus --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' -H 'content-type: text/plain;' http://127.0.0.1:18843/
```

### Issue: Script crashes midway

**Fix:** The script saves progress - just run it again!

```bash
# It will resume from last saved block
node scripts/scan-verusids-historical-backfill.js
```

### Issue: Database connection error

**Fix:** Check DATABASE_URL in .env.local

```bash
# Test database connection
node scripts/check-database-health.js
```

---

## Expected Results

### After Historical Backfill:

```
📊 Before:
   - Blocks: 1,077,805 - 3,767,983
   - Stakes: 35,303
   - VerusIDs: 162

📊 After (estimated):
   - Blocks: 800,200 - 3,767,983  ✅ COMPLETE!
   - Stakes: ~50,000 - 100,000
   - VerusIDs: ~500 - 1,000
```

### After Continuous Scanning:

```
✅ Always up-to-date with blockchain tip
✅ New stakes appear within 5 minutes
✅ All VerusIDs tracked automatically
```

---

## Maintenance Schedule

### Daily:

- Continuous scanner runs automatically (if using daemon)

### Weekly:

- Recalculate statistics: `node scripts/recalculate-all-stats.js`

### Monthly:

- Check database health: `node scripts/check-database-health.js`
- Verify integrity: `node scripts/verify-database-integrity.js`

---

## Documentation

- **Full Plan:** [DATABASE-CONSOLIDATION-PLAN.md](./DATABASE-CONSOLIDATION-PLAN.md)
- **Legacy Table:** [STAKE_EVENTS_LEGACY.md](./STAKE_EVENTS_LEGACY.md)
- **Staking Status:** [STAKING-DATABASE-STATUS.md](./STAKING-DATABASE-STATUS.md)

---

## Quick Commands Reference

```bash
# Historical backfill (one-time, ~2.5 hours)
node scripts/scan-verusids-historical-backfill.js

# Verify coverage
node scripts/check-coverage-gaps.js

# Analyze tables
node scripts/analyze-stake-tables.js

# Recalculate stats
node scripts/recalculate-all-stats.js

# Continuous scanning
./start-verusid-sync.sh
```

---

## Questions?

Run the analysis scripts to get detailed information about your database state:

```bash
# Complete analysis
node scripts/analyze-stake-tables.js
node scripts/check-coverage-gaps.js

# Test a specific VerusID
node scripts/check-joanna-scan-status.js
```

---

## Success Criteria

You'll know the consolidation is complete when:

- ✅ staking_rewards table has data from block 800,200
- ✅ Historical gap (800,200 - 1,077,804) is filled
- ✅ Continuous scanner is running
- ✅ joanna@ shows stakes from July 2020 onwards
- ✅ verusid_statistics table is up to date

**Ready? Run the backfill:**

```bash
node scripts/scan-verusids-historical-backfill.js
```

Good luck! 🚀
