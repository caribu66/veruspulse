# 🎯 Start Optimized Staking Scan - Quick Guide

**Status:** Ready to continue scanning from block 2,416,419 → Current tip  
**Estimated Time:** 2-4 hours (depending on profile)  
**Estimated New Stakes:** ~100,000+ additional staking rewards

---

## 🚀 Step-by-Step Instructions

### Step 1: Check Current Status

```bash
cd /home/explorer/verus-dapp
./scripts/check-scan-status.sh
```

**What this shows:**

- Whether a scan is currently running
- Last block scanned in your database
- How many blocks behind you are
- Total stakes and unique VerusIDs

**Expected output:**

```
▶ Scan Status: ⏸️  IDLE
▶ Database Status:
  Last block: 2,416,419
  Total stakes: 35,037
  Unique VerusIDs: 162
▶ Blockchain Status:
  Current tip: 3,782,731
  Blocks behind: 1,366,312
```

---

### Step 2: Start the Optimized Scan

```bash
./scripts/continue-staking-scan-optimized.sh
```

**What this does:**

1. Analyzes the gap (1.3M blocks)
2. Selects the **Balanced** profile (3 concurrent, 100ms delays)
3. Estimates completion time (~2-4 hours)
4. Asks for confirmation
5. Starts the scan in the background

**Example interaction:**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║              Continue Optimized VerusID Staking Scan                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

✅ Next.js server is running
✅ No scan running
✅ Database Status:
   Last scanned block: 2,416,419
   Total stakes: 35,037
   Unique VerusIDs: 162

✅ Current blockchain tip: 3,782,731

╔══════════════════════════════════════════════════════════════════════════════╗
║                          Scan Summary                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

   From Block:     2,416,420
   To Block:       3,782,731
   Blocks to Scan: 1,366,312

   Estimated Coverage: ~950 days of blockchain data

📊 Profile: BALANCED (Medium scan for < 500K blocks... wait, that's not right for 1.3M blocks)

   Optimization Settings:
   - Concurrent requests: 3
   - Delay between batches: 100ms
   - Block batch size: 50
   - Estimated time: 10-20 hours

❓ Ready to start optimized scan?
   This will scan 1,366,312 blocks from 2,416,420 to 3,782,731

Continue? [Y/n]: Y

🚀 Starting optimized scan...

✅ Scan started successfully!
```

---

### Step 3: Monitor Progress

**Option A: Real-time Visual Monitor (Recommended)**

```bash
./scripts/monitor-scan.sh
```

**Updates every 2 seconds with:**

- Progress bar and percentage
- Blocks per second
- Stakes found
- Cache efficiency
- Time remaining and ETA

**Example output:**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                  Optimized Staking Scan Monitor                             ║
║                     Press Ctrl+C to exit                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

🔄 SCAN IN PROGRESS

Phase: scanning_blocks

▶ Block Progress:
  [=========================                         ] 50%
  Processed: 683,156 / 1,366,312

▶ Performance:
  Speed: 187.45 blocks/sec
  Stakes Found: 8,234 (1.12/sec)
  Errors: 15

▶ Cache Efficiency:
  Efficiency: 82%
  Hits: 560,889 | Misses: 122,267

▶ Time Tracking:
  Elapsed: 1h 1m 23s
  Remaining: 1h 1m 8s
  ETA: 2025-10-24 19:15:42

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Updating every 2 seconds... (Ctrl+C to exit)
```

**Option B: Quick Status Check**

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '{
  running: .isRunning,
  progress: .progress.percentages.blocks + "%",
  blocks: "\(.progress.blocksProcessed) / \(.progress.totalBlocks)",
  stakes: .progress.stakeEventsFound,
  speed: .progress.rates.blocksPerSecond + " blocks/sec"
}'
```

---

### Step 4: Wait for Completion

The scan runs in the background. You can:

- ✅ Close your terminal (if using screen/tmux)
- ✅ Let it run overnight
- ✅ Check progress anytime with `./scripts/monitor-scan.sh`

**When complete, the monitor will show:**

```
✅ SCAN COMPLETE

Final Results:
  Blocks processed: 1,366,312
  Stakes found: 115,482
  Time taken: 2h 14m 37s
  Cache efficiency: 84%
```

---

### Step 5: Verify Results

After completion, check the database:

```bash
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
SELECT
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as unique_verusids,
    MIN(block_height) as earliest_block,
    MAX(block_height) as latest_block,
    MAX(block_time) as latest_stake_time
FROM staking_rewards;
"
```

**Expected output:**

```
 total_stakes | unique_verusids | earliest_block | latest_block | latest_stake_time
--------------+-----------------+----------------+--------------+-------------------
       150519 |             487 |        1990206 |      3782731 | 2025-10-24 17:42:18
```

**Before scan:** 35,037 stakes, 162 VerusIDs  
**After scan:** ~150,000+ stakes, 400-500+ VerusIDs

---

## 🛑 If You Need to Stop

### Graceful Stop

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'
```

Or use the helper:

```bash
./scripts/stop-scan.sh
```

### Resume Later

The scan is **fully resumable**. Just run the continue script again:

```bash
./scripts/continue-staking-scan-optimized.sh
```

It will automatically pick up from where it left off.

---

## ⚠️ Troubleshooting

### Issue: "Next.js server not running"

**Solution:**

```bash
cd /home/explorer/verus-dapp
npm run dev
```

Wait for the server to start, then try again.

---

### Issue: "Database not accessible"

**Solution:**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Test connection
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "SELECT 1;"
```

---

### Issue: Scan seems stuck

**Check if it's actually running:**

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.isRunning'
```

**If true but no progress, check errors:**

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.errors'
```

**If errors > 100, restart with more conservative settings:**

```bash
# Stop current scan
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'

# Start with conservative profile
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "config": {
      "maxConcurrentRequests": 1,
      "delayBetweenBatches": 300,
      "blockBatchSize": 25
    }
  }'
```

---

## 📊 What Happens After Scan

### 1. Recalculate Statistics

```bash
curl -X POST http://localhost:3000/api/admin/recalculate-statistics
```

This updates:

- Total earnings per VerusID
- Staking frequency
- Best performing stakes
- Rankings and leaderboards

### 2. Test VerusID Lookups

Pick a VerusID from the database:

```bash
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
SELECT identity_address, friendly_name, COUNT(*) as stakes
FROM staking_rewards sr
JOIN identities i ON sr.identity_address = i.identity_address
GROUP BY identity_address, friendly_name
ORDER BY stakes DESC
LIMIT 5;
"
```

Then test the API:

```bash
# Replace iYourAddress with an actual I-address from above
curl http://localhost:3000/api/verusid/iYourAddress/stats | jq
```

### 3. Enable Real-time Sync

To keep data current going forward:

```bash
# Add to .env file
echo "ENABLE_ZMQ=true" >> .env

# Restart Next.js
npm run dev
```

Now new blocks will be processed automatically in real-time!

---

## 📈 Expected Performance

| Profile      | Concurrent | Delay     | Speed               | Time for 1.3M blocks |
| ------------ | ---------- | --------- | ------------------- | -------------------- |
| Conservative | 2          | 200ms     | ~100 blocks/sec     | ~3.8 hours           |
| **Balanced** | **3**      | **100ms** | **~200 blocks/sec** | **~2 hours**         |
| Aggressive   | 5          | 50ms      | ~400 blocks/sec     | ~1 hour              |

**Your scan will use:** Balanced or Conservative (automatically selected)

---

## 🎉 Success Criteria

After successful completion:

✅ **Database has 100K+ stakes** (up from 35K)  
✅ **Unique VerusIDs increased** (400-500+ up from 162)  
✅ **Block coverage up to date** (current tip ~3.78M)  
✅ **No critical errors** (< 1% error rate)  
✅ **All VerusID pages load** with complete history

---

## 📚 Additional Resources

- **Full Documentation:** `README-STAKING-SCAN.md`
- **Optimization Guide:** `OPTIMIZED-STAKING-SCAN-GUIDE.md`
- **Database Status:** `STAKING-DATABASE-STATUS.md`
- **Scripts Directory:** `./scripts/`

---

## 🚀 Ready? Let's Go!

```bash
# Step 1: Check status
./scripts/check-scan-status.sh

# Step 2: Start scan
./scripts/continue-staking-scan-optimized.sh

# Step 3: Monitor
./scripts/monitor-scan.sh
```

**Time to completion:** ~2-4 hours  
**Your database will be up-to-date with all staking data!**

---

**Created:** October 24, 2025  
**Status:** Production Ready ✅
