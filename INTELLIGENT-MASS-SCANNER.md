# Intelligent Mass Scanner for 10,000+ VerusIDs

## 🚀 Overview

The Intelligent Mass Scanner is designed to scan **all historical blockchain data** for **10,000+ VerusIDs** without hammering the RPC. It implements sophisticated rate limiting, caching, and resource management.

## ✅ Key Features

### 1. **Smart Rate Limiting**
- **Concurrent Requests**: Configurable (default: 2-5 concurrent)
- **Batch Delays**: 100-200ms delays between batches
- **Request Throttling**: Minimum 10ms between individual requests
- **Exponential Backoff**: Automatic retry with increasing delays

### 2. **Intelligent Caching**
- **Block Data Caching**: Caches up to 1000 blocks to reduce duplicate requests
- **Cache Efficiency Tracking**: Monitors hit/miss ratios
- **Memory Management**: Automatically evicts old entries

### 3. **Resource Management**
- **Small Batch Sizes**: 25-100 blocks per batch
- **Low Concurrency**: 2-5 concurrent requests (configurable)
- **Progress Tracking**: Real-time progress with ETA
- **Error Handling**: Graceful error handling with retry logic

### 4. **Multi-Phase Discovery**
- **Phase 1**: Discover VerusIDs from existing data
- **Phase 2**: Scan identities table
- **Phase 3**: Mine recent blocks for new addresses
- **Phase 4**: Scan all blocks for stake events
- **Phase 5**: Calculate comprehensive statistics

## 📊 Scan Configurations

### Conservative (Full History)
```json
{
  "maxConcurrentRequests": 2,
  "delayBetweenBatches": 200,
  "blockBatchSize": 25,
  "addressBatchSize": 5,
  "cacheBlockData": true,
  "maxRetries": 5,
  "backoffMultiplier": 3
}
```
**Use for**: Full blockchain history, production environments

### Moderate (Recent History)
```json
{
  "maxConcurrentRequests": 5,
  "delayBetweenBatches": 50,
  "blockBatchSize": 100,
  "addressBatchSize": 20,
  "cacheBlockData": true,
  "maxRetries": 3,
  "backoffMultiplier": 2
}
```
**Use for**: Last 30-90 days, development environments

### Aggressive (Testing Only)
```json
{
  "maxConcurrentRequests": 10,
  "delayBetweenBatches": 10,
  "blockBatchSize": 200,
  "addressBatchSize": 50,
  "cacheBlockData": true,
  "maxRetries": 2,
  "backoffMultiplier": 1.5
}
```
**Use for**: Testing only, may stress RPC

## 🎯 Usage

### Start Full Historical Scan (10,000 VerusIDs)
```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan-full-history",
    "limitAddresses": 10000
  }'
```

### Start Recent Scan (Last 30 Days)
```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan-recent",
    "days": 30,
    "limitAddresses": 10000
  }'
```

### Custom Configuration
```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "config": {
      "maxConcurrentRequests": 3,
      "delayBetweenBatches": 150,
      "blockBatchSize": 50,
      "cacheBlockData": true
    },
    "options": {
      "startFromHeight": 1,
      "limitAddresses": 10000
    }
  }'
```

## 📈 Monitoring

### Check Progress
```bash
# Basic progress
curl -s http://localhost:3000/api/admin/mass-scan | jq

# Detailed progress
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress'

# Key metrics only
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress | {
  phase: .currentPhase,
  addresses: "\(.addressesProcessed)/\(.totalAddresses)",
  blocks: "\(.blocksProcessed)/\(.totalBlocks)",
  stakes: .stakeEventsFound,
  blockPercent: .percentages.blocks,
  blocksPerSec: .rates.blocksPerSecond,
  stakesPerSec: .rates.stakesPerSecond,
  eta: .estimatedCompletion,
  elapsed: .elapsedTime,
  errors: .errors,
  cacheHits: .cacheHits
}'
```

### Stop Scan
```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

### Watch Progress (Auto-refresh every 10 seconds)
```bash
watch -n 10 'curl -s http://localhost:3000/api/admin/mass-scan | jq ".progress | {phase: .currentPhase, blocks: .blocksProcessed, stakes: .stakeEventsFound, blocksPerSec: .rates.blocksPerSecond}"'
```

## 🗄️ Database Queries

### Check Stake Events
```sql
-- Total stake events
SELECT COUNT(*) FROM stake_events;

-- Unique stakers
SELECT COUNT(DISTINCT address) FROM stake_events;

-- Stakes by address
SELECT 
  address, 
  COUNT(*) as stakes, 
  SUM(reward_amount)/100000000.0 as total_vrsc 
FROM stake_events 
GROUP BY address 
ORDER BY stakes DESC 
LIMIT 20;

-- Recent activity
SELECT 
  address, 
  block_height, 
  block_time, 
  reward_amount/100000000.0 as reward_vrsc 
FROM stake_events 
ORDER BY block_time DESC 
LIMIT 10;
```

### Check Block Analytics
```sql
-- Total blocks analyzed
SELECT COUNT(*) FROM block_analytics;

-- PoS vs PoW distribution
SELECT 
  block_type, 
  COUNT(*) as count,
  AVG(reward_amount)/100000000.0 as avg_reward_vrsc
FROM block_analytics 
GROUP BY block_type;

-- Recent blocks
SELECT 
  height, 
  block_type, 
  tx_count, 
  reward_amount/100000000.0 as reward_vrsc 
FROM block_analytics 
ORDER BY height DESC 
LIMIT 10;
```

## ⏱️ Performance Estimates

### Full Historical Scan (All Blocks)
- **Blocks**: ~3,700,000 blocks
- **Time per block**: ~0.5-1 second (with rate limiting)
- **Estimated duration**: 20-40 hours
- **RPC load**: Very low, sustainable
- **Memory usage**: ~500MB-1GB

### Recent Scan (30 Days)
- **Blocks**: ~43,200 blocks
- **Time per block**: ~0.2-0.5 seconds
- **Estimated duration**: 2-6 hours
- **RPC load**: Low to moderate
- **Memory usage**: ~200-500MB

### Recent Scan (90 Days)
- **Blocks**: ~129,600 blocks
- **Time per block**: ~0.3-0.6 seconds
- **Estimated duration**: 10-20 hours
- **RPC load**: Low
- **Memory usage**: ~300-700MB

## 🔍 What Gets Collected

For each stake event:
- ✅ Address (VerusID I-address)
- ✅ Transaction ID
- ✅ Block height & timestamp
- ✅ Reward amount (satoshis)
- ✅ Stake amount (satoshis)
- ✅ Stake age (blocks)

For each block:
- ✅ Block hash & height
- ✅ Block type (PoS/PoW)
- ✅ Difficulty
- ✅ Transaction count
- ✅ Total fees
- ✅ Reward amount
- ✅ Staker address (if PoS)

## 📊 Statistics Calculated

After scanning, the system calculates for each address:
- **APY**: All-time, yearly, 90d, 30d, 7d
- **ROI**: All-time, yearly
- **Frequency**: Stakes per day/week/month
- **Efficiency**: Staking efficiency score
- **UTXO Health**: Eligible, cooldown, fragmentation
- **Rankings**: Network rank & percentile
- **Records**: Highest/lowest rewards, streaks
- **Trends**: Increasing/decreasing/stable patterns
- **Time Series**: Daily, weekly, monthly aggregates

## 🎯 Current Scan Status

Check status anytime:
```bash
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.currentPhase'
```

Phases:
1. `discovering_identities` - Finding all VerusID addresses
2. `determining_range` - Calculating block range
3. `scanning_blocks` - Extracting stake events from blocks
4. `calculating_statistics` - Computing all metrics
5. `complete` - Scan finished

## 🛡️ Safety Features

### Rate Limiting
- Minimum 10ms between requests
- Configurable delays between batches
- Concurrent request limits

### Error Handling
- Automatic retries with exponential backoff
- Graceful error logging
- Scan continues on individual errors

### Resource Management
- Block cache with size limits
- Memory-efficient batch processing
- Automatic cache eviction

### Progress Persistence
- All data stored in PostgreSQL
- Resumable scans (can restart from last processed block)
- No data loss on interruption

## 📝 Logs

Server logs will show:
```
[Intelligent Scanner] Starting comprehensive scan...
[Discovery] Found 2 addresses from existing data
[Discovery] Checking identities table...
[Discovery] Total unique addresses: 2
[Intelligent Scan] Starting optimized block scanning...
[Intelligent Scan] Config: 2 concurrent, 200ms delay
[Progress] 1000/3769728 blocks (0.03%), 143 stakes found, ETA: 2:45:30 PM
[Cache] Efficiency: 12.5%, Hits: 125, Misses: 875
[Statistics] Calculating stats for 2 addresses...
[Statistics] Complete! Processed 2 addresses
[Intelligent Scanner] Scan complete!
  Total Addresses: 2
  Total Blocks: 3769728
  Stake Events: 8266
  Cache Efficiency: 15.3%
  Errors: 23
```

## 🚨 Troubleshooting

### Scan seems stuck
```bash
# Check if scan is actually running
curl -s http://localhost:3000/api/admin/mass-scan | jq '.isRunning'

# Check current phase
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.currentPhase'

# Check for errors
curl -s http://localhost:3000/api/admin/mass-scan | jq '.progress.errors'
```

### RPC errors
- Scanner automatically retries with exponential backoff
- Check RPC connectivity: `curl -X POST http://localhost:8000 -d '{"method":"getblockchaininfo"}'`
- Reduce concurrency: Use `maxConcurrentRequests: 1`

### Memory issues
- Disable caching: `cacheBlockData: false`
- Reduce batch sizes: `blockBatchSize: 10`

### Slow progress
- This is expected! Full history takes 20-40 hours
- Increase concurrency at your own risk (may hammer RPC)
- Use `scan-recent` for faster results

## ✨ Best Practices

1. **Start with recent scan** (30-90 days) to get initial data quickly
2. **Run full historical scan overnight** or over weekend
3. **Monitor RPC load** on your Verus daemon
4. **Check cache efficiency** - should be 10-30% for random access
5. **Verify data** by comparing with known VerusIDs
6. **Set up regular incremental scans** (daily) after initial full scan

## 🎉 Success!

Once complete, your dashboard will show:
- ✅ Real historical data for 10,000+ VerusIDs
- ✅ Comprehensive statistics and trends
- ✅ Network rankings and leaderboards
- ✅ Accurate APY, ROI, and performance metrics
- ✅ Time-series charts with actual data
- ✅ All data updated in real-time

The wait is worth it! 🚀

