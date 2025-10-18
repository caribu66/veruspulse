# Mass Scanner Scripts - Quick Guide

## 🚀 Quick Start

### Start the Scanner (Interactive)

```bash
./scripts/start-mass-scan.sh
```

This interactive script will guide you through choosing:

1. Full history scan (20-40 hours)
2. Recent 30 days (2-6 hours)
3. Recent 90 days (10-20 hours)
4. Custom configuration

### Monitor Progress (Real-time)

```bash
./scripts/monitor-scan.sh
```

Shows live progress with:

- Current phase
- Blocks processed
- Stakes found
- Cache efficiency
- ETA

### Stop Scanner

```bash
./scripts/stop-scan.sh
```

### Check Database

```bash
./scripts/check-database.sh
```

Shows:

- Total stake events
- Unique stakers
- Top 10 stakers
- Block analytics
- Recent activity

## 📋 Manual Commands

### Start Full History Scan

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"scan-full-history","limitAddresses":10000}'
```

### Start Recent Scan (30 days)

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"scan-recent","days":30,"limitAddresses":10000}'
```

### Check Status

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq
```

### Quick Status

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '{
  isRunning,
  phase: .progress.currentPhase,
  blocks: "\(.progress.blocksProcessed)/\(.progress.totalBlocks)",
  stakes: .progress.stakeEventsFound
}'
```

### Stop

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'
```

## 🗄️ Database Queries

### Total Stakes

```bash
psql "postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db" \
  -c "SELECT COUNT(*) FROM stake_events;"
```

### Unique Stakers

```bash
psql "postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db" \
  -c "SELECT COUNT(DISTINCT address) FROM stake_events;"
```

### Top Stakers

```bash
psql "postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db" \
  -c "SELECT address, COUNT(*) as stakes, SUM(reward_amount)/100000000.0 as vrsc FROM stake_events GROUP BY address ORDER BY stakes DESC LIMIT 20;"
```

## ⚙️ Configuration Options

### Conservative (Default for Full History)

- Max concurrent: 2 requests
- Delay: 200ms between batches
- Batch size: 25 blocks
- Best for: Production, full history

### Moderate (Default for Recent)

- Max concurrent: 5 requests
- Delay: 50ms between batches
- Batch size: 100 blocks
- Best for: Recent data, development

### Custom Example

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "config": {
      "maxConcurrentRequests": 3,
      "delayBetweenBatches": 100,
      "blockBatchSize": 50,
      "cacheBlockData": true
    },
    "options": {
      "startFromHeight": 3700000,
      "limitAddresses": 5000
    }
  }'
```

## 📊 What Gets Scanned

### Per Stake Event:

- Address (VerusID)
- Transaction ID
- Block height & timestamp
- Reward amount
- Stake amount
- Stake age

### Per Block:

- Block hash & height
- Block type (PoS/PoW)
- Difficulty
- Transaction count
- Total fees
- Staker address

### Statistics (After Scan):

- APY (all-time, yearly, 90d, 30d, 7d)
- ROI (all-time, yearly)
- Staking frequency
- Efficiency scores
- UTXO health
- Network rankings
- Time series data
- Trends & predictions

## ⏱️ Time Estimates

| Scan Type    | Blocks | Duration  | RPC Load |
| ------------ | ------ | --------- | -------- |
| Full History | ~3.7M  | 20-40 hrs | Very Low |
| 90 Days      | ~130K  | 10-20 hrs | Low      |
| 30 Days      | ~43K   | 2-6 hrs   | Low      |
| 7 Days       | ~10K   | 0.5-2 hrs | Moderate |

## 🔧 Troubleshooting

### Scanner seems stuck

Check if it's actually running:

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.isRunning'
```

Check current phase:

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.currentPhase'
```

### RPC Connection Issues

The scanner automatically retries with exponential backoff. Check error count:

```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.errors'
```

### Memory Issues

Disable caching or reduce batch sizes in custom config.

### Too Slow

- Increase `maxConcurrentRequests` (careful!)
- Decrease `delayBetweenBatches`
- Increase `blockBatchSize`

## 📝 Log Files

Scanner logs appear in your Next.js server console:

```
[Intelligent Scanner] Starting comprehensive scan...
[Discovery] Found 2 addresses from existing data
[Intelligent Scan] Starting optimized block scanning...
[Progress] 1000/3769728 blocks (0.03%), 143 stakes found
```

## 🎯 Best Practices

1. **Start with recent scan** (30 days) to get data quickly
2. **Run full history overnight** or over weekend
3. **Monitor cache efficiency** - should be 10-30%
4. **Check RPC load** on your Verus daemon
5. **Verify results** against known VerusIDs
6. **Set up incremental scans** after initial full scan

## 💡 Tips

- Scanner runs in background, safe to close terminal
- Data persists in PostgreSQL database
- Scan is resumable (can stop and restart)
- Dashboard updates automatically when data is ready
- Statistics calculated automatically after scan completes

## 🆘 Support

Full documentation: `/INTELLIGENT-MASS-SCANNER.md`

Check scanner status anytime:

```bash
curl -s http://localhost:3000/api/admin/mass-scan
```
