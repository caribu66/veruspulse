# 📊 VerusID Staking Scanner - Complete Guide

## Quick Start (TL;DR)

```bash
# 1. Check current status
./scripts/check-scan-status.sh

# 2. Start optimized scan from last checkpoint
./scripts/continue-staking-scan-optimized.sh

# 3. Monitor progress in real-time
./scripts/monitor-scan.sh
```

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Available Scripts](#available-scripts)
5. [Scanning Modes](#scanning-modes)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

The VerusID Staking Scanner is an **intelligent, resumable blockchain scanner** that collects staking rewards data for all VerusIDs on the Verus blockchain.

### Key Features

✅ **Intelligent Rate Limiting** - Prevents RPC overload with adaptive throttling  
✅ **Smart Caching** - Reduces duplicate RPC calls by up to 80%  
✅ **Fully Resumable** - Stops and resumes from last checkpoint  
✅ **Real-time Progress** - Live monitoring with ETA and metrics  
✅ **Adaptive Profiles** - Automatically selects optimal scan parameters  
✅ **Error Recovery** - Exponential backoff and retry logic

---

## Current Status

Your database currently contains:

- **35,037 staking rewards** (as of Oct 19, 2025)
- **32,990 unique VerusIDs**
- **Block coverage:** 1,990,206 → 2,416,419 (Feb 2023)
- **Gap to current tip:** ~1,366,312 blocks (~950 days)

**Goal:** Scan from block 2,416,420 to current tip (~3,782,731)

---

## Architecture

### Data Flow

```
Blockchain (verusd RPC)
    ↓
IntelligentMassScanner
    ├─ Block Discovery
    ├─ PoS Detection
    ├─ Stake Extraction
    └─ Database Storage
        ↓
PostgreSQL (verus_utxo_db)
    ├─ staking_rewards
    ├─ identities
    └─ scan_metadata
```

### Scanner Components

| Component                  | Purpose                                 |
| -------------------------- | --------------------------------------- |
| **IntelligentMassScanner** | Main scanning engine with rate limiting |
| **RPC Client**             | Robust RPC calls with retry logic       |
| **Cache Manager**          | LRU cache for block data                |
| **Progress Tracker**       | Real-time metrics and ETA               |
| **Database Layer**         | PostgreSQL with atomic commits          |

---

## Available Scripts

### Core Scripts

| Script                               | Purpose                   | When to Use           |
| ------------------------------------ | ------------------------- | --------------------- |
| `check-scan-status.sh`               | Quick status overview     | Always start here     |
| `continue-staking-scan-optimized.sh` | Resume from last block    | **Primary scan tool** |
| `monitor-scan.sh`                    | Real-time progress viewer | While scan is running |
| `start-mass-scan.sh`                 | Interactive scan starter  | For custom configs    |
| `stop-scan.sh`                       | Gracefully stop scan      | To pause scanning     |

### Usage Examples

#### 1. Check What Needs Scanning

```bash
cd /home/explorer/verus-dapp
./scripts/check-scan-status.sh
```

Output example:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        Scan Status Check                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

▶ Scan Status:
  ⏸️  IDLE

▶ Database Status:
  Last block: 2,416,419
  Total stakes: 35,037
  Unique VerusIDs: 162

▶ Blockchain Status:
  Current tip: 3,782,731
  Blocks behind: 1,366,312
```

#### 2. Start the Optimized Scan

```bash
./scripts/continue-staking-scan-optimized.sh
```

This will:

1. Analyze the gap (1.3M blocks)
2. Select **Balanced** profile automatically
3. Start scanning with optimal settings
4. Provide monitoring instructions

#### 3. Monitor Progress

```bash
./scripts/monitor-scan.sh
```

Real-time output:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                  Optimized Staking Scan Monitor                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

🔄 SCAN IN PROGRESS

Phase: scanning_blocks

▶ Block Progress:
  [==========================                        ] 52%
  Processed: 710,872 / 1,366,312

▶ Performance:
  Speed: 197.32 blocks/sec
  Stakes Found: 12,483 (1.47/sec)
  Errors: 23

▶ Cache Efficiency:
  Efficiency: 78%
  Hits: 551,234 | Misses: 159,638

▶ Time Tracking:
  Elapsed: 1h 2m
  Remaining: 58m 14s
  ETA: 2025-10-24 18:42:17
```

---

## Scanning Modes

### 1. Continue from Checkpoint (Recommended)

```bash
./scripts/continue-staking-scan-optimized.sh
```

**Best for:** Resuming after interruption or updating to current tip

**Profile Selection:**

- < 50K blocks → **Recent** (5 concurrent, 50ms delay)
- 50K-500K blocks → **Balanced** (3 concurrent, 100ms delay)
- \> 500K blocks → **Conservative** (2 concurrent, 200ms delay)

### 2. Custom Scan via API

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
      "startFromHeight": 2416420,
      "limitAddresses": 10000
    }
  }'
```

### 3. Recent Scan (Last N Days)

```bash
curl -X POST http://localhost:3000/api/admin/mass-scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan-recent",
    "days": 30,
    "limitAddresses": 10000
  }'
```

---

## Monitoring

### Real-time Monitor

```bash
./scripts/monitor-scan.sh
```

Updates every 2 seconds with:

- Progress bar and percentage
- Blocks per second
- Stakes found
- Cache efficiency
- ETA

### API Status Check

```bash
# Full status
curl -s http://localhost:3000/api/admin/mass-scan | jq

# Compact view
curl -s http://localhost:3000/api/admin/mass-scan | jq '{
  running: .isRunning,
  phase: .progress.currentPhase,
  progress: .progress.percentages.blocks + "%",
  stakes: .progress.stakeEventsFound,
  speed: .progress.rates.blocksPerSecond + " blocks/sec"
}'
```

### Database Monitoring

```bash
# Check last block scanned
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
SELECT MAX(block_height) as last_block FROM staking_rewards;
"

# Count stakes by hour
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
SELECT
    date_trunc('hour', block_time) as hour,
    COUNT(*) as stakes
FROM staking_rewards
WHERE block_time > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
"
```

---

## Troubleshooting

### Issue: Scan Stops Unexpectedly

**Symptoms:**

- Monitor shows no progress
- `isRunning` becomes false

**Solutions:**

1. Check RPC connectivity:

   ```bash
   /home/explorer/verus-cli/verus getblockchaininfo
   ```

2. Check disk space:

   ```bash
   df -h
   ```

3. Check database health:

   ```bash
   PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
   SELECT pg_database_size('verus_utxo_db')/1024/1024 as size_mb;
   "
   ```

4. Restart with more conservative settings:
   ```bash
   curl -X POST http://localhost:3000/api/admin/mass-scan \
     -H "Content-Type: application/json" \
     -d '{
       "action": "start",
       "config": {
         "maxConcurrentRequests": 1,
         "delayBetweenBatches": 500,
         "blockBatchSize": 10
       }
     }'
   ```

### Issue: High Error Rate

**Symptoms:**

- Errors > 100 in monitor
- Slow progress

**Solutions:**

1. Stop the scan:

   ```bash
   ./scripts/stop-scan.sh
   ```

2. Check RPC load:

   ```bash
   watch -n 1 '/home/explorer/verus-cli/verus getinfo | grep connections'
   ```

3. Increase delays:
   - Change `delayBetweenBatches` from 100ms to 300ms
   - Reduce `maxConcurrentRequests` from 3 to 1

### Issue: Database Lock Errors

**Symptoms:**

- "deadlock detected" errors
- Slow stake inserts

**Solutions:**

1. Check active connections:

   ```bash
   PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
   SELECT count(*) FROM pg_stat_activity
   WHERE datname = 'verus_utxo_db' AND state = 'active';
   "
   ```

2. Kill long-running queries:
   ```bash
   PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'verus_utxo_db'
   AND state = 'idle in transaction'
   AND now() - query_start > interval '5 minutes';
   "
   ```

---

## API Reference

### Start Scan

**Endpoint:** `POST /api/admin/mass-scan`

**Body:**

```json
{
  "action": "start",
  "config": {
    "maxConcurrentRequests": 3,
    "delayBetweenBatches": 100,
    "blockBatchSize": 50,
    "addressBatchSize": 10,
    "cacheBlockData": true,
    "maxRetries": 3,
    "backoffMultiplier": 2
  },
  "options": {
    "startFromHeight": 2416420,
    "endAtHeight": 3782731,
    "limitAddresses": 10000
  }
}
```

### Get Status

**Endpoint:** `GET /api/admin/mass-scan`

**Response:**

```json
{
  "success": true,
  "isRunning": true,
  "progress": {
    "currentPhase": "scanning_blocks",
    "blocksProcessed": 710872,
    "totalBlocks": 1366312,
    "stakeEventsFound": 12483,
    "percentages": {
      "blocks": "52.03"
    },
    "rates": {
      "blocksPerSecond": "197.32",
      "stakesPerSecond": "1.47"
    },
    "estimatedCompletion": "2025-10-24T18:42:17.000Z"
  }
}
```

### Stop Scan

**Endpoint:** `POST /api/admin/mass-scan`

**Body:**

```json
{
  "action": "stop"
}
```

---

## Performance Tips

### 1. Optimize for Your Hardware

**Fast Server (8+ cores, SSD):**

```json
{
  "maxConcurrentRequests": 5,
  "delayBetweenBatches": 50,
  "blockBatchSize": 100
}
```

**Medium Server (4 cores, SSD):**

```json
{
  "maxConcurrentRequests": 3,
  "delayBetweenBatches": 100,
  "blockBatchSize": 50
}
```

**Light Server (2 cores, HDD):**

```json
{
  "maxConcurrentRequests": 1,
  "delayBetweenBatches": 300,
  "blockBatchSize": 25
}
```

### 2. Monitor System Resources

```bash
# CPU usage
htop

# Disk I/O
iostat -x 2

# Network
iftop

# PostgreSQL activity
watch -n 1 'PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "SELECT count(*) FROM pg_stat_activity;"'
```

### 3. Tune PostgreSQL

```bash
# Increase work_mem for better performance
PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
ALTER SYSTEM SET work_mem = '64MB';
SELECT pg_reload_conf();
"
```

---

## Expected Results

After completing the scan, you should have:

| Metric              | Before          | After (Estimated) |
| ------------------- | --------------- | ----------------- |
| **Total Stakes**    | 35,037          | ~150,000+         |
| **Unique VerusIDs** | 162             | 500+              |
| **Block Coverage**  | Up to 2,416,419 | Up to ~3,782,731  |
| **Date Coverage**   | Up to Feb 2023  | Up to Oct 2025    |
| **Database Size**   | ~500 MB         | ~2 GB             |

---

## Next Steps After Scan

1. **Verify Data Integrity**

   ```bash
   PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -c "
   SELECT
     COUNT(*) as total_stakes,
     MIN(block_height) as first_block,
     MAX(block_height) as last_block,
     COUNT(DISTINCT identity_address) as unique_verusids
   FROM staking_rewards;
   "
   ```

2. **Recalculate Statistics**

   ```bash
   curl -X POST http://localhost:3000/api/admin/recalculate-statistics
   ```

3. **Enable Real-time Sync**

   ```bash
   echo "ENABLE_ZMQ=true" >> .env
   npm run dev
   ```

4. **Test VerusID Lookup**
   ```bash
   # Replace with an actual I-address
   curl http://localhost:3000/api/verusid/iYourAddress/stats
   ```

---

## Support

- **Scripts:** `/home/explorer/verus-dapp/scripts/`
- **Documentation:** This file and `OPTIMIZED-STAKING-SCAN-GUIDE.md`
- **API Docs:** `/api/admin/mass-scan` endpoints
- **Database:** verus_utxo_db on localhost:5432

---

**Last Updated:** October 24, 2025  
**Scanner Version:** IntelligentMassScanner v2.0  
**Status:** Ready for production use
