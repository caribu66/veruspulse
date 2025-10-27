# 🚀 Staking Scan - Quick Reference Card

**Status:** ✅ Ready to use  
**Your Gap:** ~1.3M blocks (Feb 2023 → Current)  
**Est. Time:** 2-4 hours

---

## 📋 Three Commands to Success

```bash
# 1️⃣ Check what needs scanning
npm run staking:check

# 2️⃣ Start the optimized scan
npm run staking:scan

# 3️⃣ Watch progress in real-time
npm run staking:monitor
```

That's it! 🎉

---

## 📊 Current Status

| Metric         | Now        | After Scan |
| -------------- | ---------- | ---------- |
| **Stakes**     | 35,037     | ~150,000+  |
| **VerusIDs**   | 162        | ~500+      |
| **Last Block** | 2,416,419  | ~3,782,731 |
| **Coverage**   | → Feb 2023 | → Current  |

---

## 🎯 What Each Command Does

### `npm run staking:check`

Quick status overview:

- Is a scan running?
- Last block scanned
- How many blocks behind
- Total stakes & VerusIDs

**When to use:** Always start here

---

### `npm run staking:scan`

Starts optimized scan:

- Resumes from last block
- Auto-selects best profile
- Shows estimated time
- Runs in background

**When to use:** To update to current tip

---

### `npm run staking:monitor`

Real-time progress viewer:

- Live progress bar
- Blocks per second
- Stakes found
- Cache efficiency
- ETA

**When to use:** While scan is running

---

## 🛑 Stop Scanning

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'
```

Or:

```bash
./scripts/stop-scan.sh
```

**Resume anytime:** Just run `npm run staking:scan` again

---

## ✅ After Scan Completes

### 1. Verify Data

```bash
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
SELECT COUNT(*) as stakes, MAX(block_height) as last_block FROM staking_rewards;"
```

### 2. Recalculate Stats

```bash
curl -X POST http://localhost:3000/api/admin/recalculate-statistics
```

### 3. Enable Real-time Updates

```bash
echo "ENABLE_ZMQ=true" >> .env
npm run dev
```

---

## 🆘 Troubleshooting One-Liners

### Server not running?

```bash
npm run dev
```

### Database not accessible?

```bash
sudo systemctl start postgresql
```

### Check RPC health?

```bash
/home/explorer/verus-cli/verus getblockchaininfo
```

### Scan seems stuck?

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.isRunning, .progress.blocksProcessed'
```

---

## 📚 Full Documentation

| File                                 | What's Inside                |
| ------------------------------------ | ---------------------------- |
| **START-STAKING-SCAN-HERE.md**       | 👈 START HERE - Step by step |
| **README-STAKING-SCAN.md**           | Complete reference           |
| **OPTIMIZED-STAKING-SCAN-GUIDE.md**  | Technical deep dive          |
| **OPTIMIZATION-COMPLETE-SUMMARY.md** | What was built               |

---

## 🎓 Key Concepts

### Scan Profiles

- **Conservative:** 2 concurrent, 200ms delay → Safe for large scans
- **Balanced:** 3 concurrent, 100ms delay → Good middle ground
- **Aggressive:** 5 concurrent, 50ms delay → Fast for small scans

**Auto-selected based on gap size**

### Cache Efficiency

- First pass: ~20% (cache building)
- Subsequent: ~80% (cache hits)
- Result: 3-4x faster scanning

### Resume Capability

- Scanner checks `MAX(block_height)` from database
- Automatically starts from last + 1
- No data duplication
- 100% safe to stop/restart

---

## 💡 Pro Tips

✅ **Run in screen/tmux** - Survives SSH disconnects  
✅ **Check status first** - Know before you start  
✅ **Monitor progress** - Watch the magic happen  
✅ **Let it finish** - Don't interrupt unnecessarily  
✅ **Verify after** - Confirm data integrity

---

## 📈 Performance Expectations

| Blocks to Scan | Profile      | Time           |
| -------------- | ------------ | -------------- |
| < 50,000       | Aggressive   | ~15-30 min     |
| 50K - 500K     | Balanced     | ~30-90 min     |
| 500K - 2M      | Conservative | ~2-6 hours     |
| **Your ~1.3M** | **Auto**     | **~2-4 hours** |

---

## 🎯 Success Indicators

While monitoring, look for:

✅ **Cache hit rate > 70%** (Good caching)  
✅ **Error count < 100** (Stable connection)  
✅ **Blocks/sec > 100** (Good speed)  
✅ **Stakes found growing** (Finding data)  
✅ **ETA stable** (Accurate prediction)

---

## 🔗 API Endpoints

```bash
# Get status
curl -s http://localhost:3000/api/admin/mass-scan

# Start scan
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'

# Stop scan
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'
```

---

## 📞 Need Help?

1. Check the logs: `npm run dev` output
2. Verify RPC: `/home/explorer/verus-cli/verus getinfo`
3. Check database: `npm run staking:status`
4. Read docs: `START-STAKING-SCAN-HERE.md`

---

## 🎉 Ready to Start?

```bash
# Check current status
npm run staking:check

# Start optimized scan
npm run staking:scan

# Monitor progress
npm run staking:monitor
```

**That's all you need!** ✨

---

**Last Updated:** October 24, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
