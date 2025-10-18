# 🚀 Quick Start Guide - Comprehensive Staking System

## ✅ Setup Complete!

Your database is configured and all tables are created. You're ready to start syncing!

---

## 🎯 Option 1: Test with a Single VerusID (Recommended First)

```bash
# Make sure your Next.js dev server is running
npm run dev

# In another terminal, test with a specific VerusID
./test-sync-single.sh joanna@
```

This will:

1. Sync the specified VerusID
2. Extract block analytics
3. Calculate comprehensive statistics
4. Display results

**Expected time:** 30-120 seconds depending on stake history

---

## 🔥 Option 2: Sync Multiple Specific VerusIDs

```bash
# Sync a few specific VerusIDs
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?batch_size=3&delay=10000' \
  -H 'Content-Type: application/json' \
  -d '{"specific_ids": ["joanna@", "allbits@", "mike@"]}'

# Check progress
curl http://localhost:3000/api/admin/sync-all-verusids
```

---

## 🌐 Option 3: Sync ALL Active VerusIDs

**⚠️ Warning:** This will sync ALL VerusIDs on the network (potentially 100s or 1000s)

```bash
# Start full sync (be patient, this takes hours)
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?batch_size=5&delay=10000'

# Monitor progress
watch -n 5 'curl -s http://localhost:3000/api/admin/sync-all-verusids | jq ".progress"'

# Pause if needed
curl -X PATCH 'http://localhost:3000/api/admin/sync-all-verusids?action=pause'

# Resume
curl -X PATCH 'http://localhost:3000/api/admin/sync-all-verusids?action=resume'

# Stop
curl -X DELETE 'http://localhost:3000/api/admin/sync-all-verusids'
```

---

## 📊 View Statistics

### In the Browser

1. Navigate to: `http://localhost:3000/verusid?name=joanna@`
2. The comprehensive dashboard will load automatically
3. Explore the interactive charts and statistics

### Via API

```bash
# Get I-address first
IADDR=$(curl -s 'http://localhost:3000/api/verusid/lookup' \
  -H 'Content-Type: application/json' \
  -d '{"input": "joanna@"}' | jq -r '.data.identity.identity.identityaddress')

# Get comprehensive statistics
curl "http://localhost:3000/api/verusid/${IADDR}/staking-stats" | jq '.'

# Get leaderboard
curl 'http://localhost:3000/api/verusids/staking-leaderboard?sort=rewards&limit=10' | jq '.'

# Get network stats
curl 'http://localhost:3000/api/network/staking-stats' | jq '.'
```

---

## 🔍 Verify Data in Database

```bash
# Check how many VerusIDs have been synced
PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -c \
  "SELECT COUNT(*) as synced_ids, SUM(total_stakes) as total_stakes FROM verusid_statistics;"

# View top 10 stakers
PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -c \
  "SELECT address, total_stakes, total_rewards_satoshis/100000000.0 as rewards_vrsc
   FROM verusid_statistics
   ORDER BY total_rewards_satoshis DESC
   LIMIT 10;"

# Check block analytics
PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -c \
  "SELECT COUNT(*) as blocks_analyzed,
          COUNT(CASE WHEN block_type='minted' THEN 1 END) as pos_blocks
   FROM block_analytics;"
```

---

## 📈 Dashboard Features

Once data is synced, the dashboard shows:

### Hero Stats (Always Visible)

- 💰 Total Rewards (VRSC)
- 📊 APY (All Time)
- ⚡ Total Stakes
- 🏆 Network Rank

### Performance Charts (Expandable)

- 📈 Monthly Rewards (Bar Chart)
- 📉 APY Trend (Line Chart)

### UTXO Health (Expandable)

- 🥧 UTXO Distribution (Pie Chart)
- ✅ Eligible vs Cooldown
- 💎 Value Metrics

### Records & Achievements (Expandable)

- 🏅 Highest Reward
- 📅 Best Month
- ⚡ Staking Frequency
- 🎖️ Milestone Badges

---

## ⚙️ Advanced Options

### Incremental Sync (Only Updated IDs)

```bash
# Only sync IDs that haven't been updated in 24+ hours
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?incremental=true&batch_size=10&delay=5000'
```

### Custom Batch Settings

```bash
# Small batches, long delays (low memory systems)
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?batch_size=3&delay=15000'

# Larger batches, short delays (high memory systems)
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?batch_size=10&delay=5000'
```

---

## 🐛 Troubleshooting

### "Statistics not found" Error

The VerusID hasn't been synced yet:

```bash
./test-sync-single.sh YOUR_VERUSID@
```

### Sync is Slow

This is normal! Each VerusID takes 30-120 seconds depending on:

- Number of historical stakes
- Blockchain responsiveness
- System resources

### High Memory Usage

The system automatically pauses at 85% memory usage. If this happens frequently:

```bash
# Use smaller batches and longer delays
curl -X POST 'http://localhost:3000/api/admin/sync-all-verusids?batch_size=3&delay=20000'
```

### Database Connection Errors

```bash
# Verify connection
PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -c "SELECT 1;"

# If that fails, re-run the fix script
./fix-postgres-auth.sh
```

---

## 📚 What Gets Synced

For each VerusID, the system:

1. **Scans blockchain** for all stake events (PoS blocks where I-address received rewards)
2. **Extracts block analytics** (20+ data points per block)
3. **Calculates statistics** (50+ metrics including APY, efficiency, rankings)
4. **Builds time-series** (daily, weekly, monthly aggregates)
5. **Stores everything** in PostgreSQL for fast queries

---

## 🎉 Success Indicators

You'll know it's working when:

✅ API returns statistics (not "not found" error)  
✅ Dashboard displays charts and metrics  
✅ Database shows records in `verusid_statistics` table  
✅ Sync progress reaches "completed" status

---

## 💡 Tips

- **Start small**: Test with 1-3 VerusIDs before syncing all
- **Monitor progress**: Use the status API to track completion
- **Be patient**: Initial sync is slow but subsequent queries are fast (< 300ms)
- **Check logs**: Run `npm run dev` to see sync progress in console
- **Schedule updates**: Run incremental sync daily to keep data fresh

---

## 🚀 Next Steps

1. Test with one VerusID: `./test-sync-single.sh joanna@`
2. View in browser: `http://localhost:3000/verusid?name=joanna@`
3. Explore the API endpoints
4. Set up scheduled syncs (cron job)
5. Enjoy comprehensive staking analytics! 🎊

---

**Need help?** Check `COMPREHENSIVE-STAKING-SYSTEM-COMPLETE.md` for detailed documentation.
