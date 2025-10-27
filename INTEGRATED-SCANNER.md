# Integrated VerusID Scanner - Stakes + UTXOs

## Overview

The **Integrated Scanner** (`scripts/scan-all-verusids-integrated.js`) is a comprehensive solution that captures BOTH staking rewards AND UTXO data in a single efficient pass.

## Why Integrated?

Instead of running separate scripts:

- ❌ `scan-all-verusids-for-stakes.js` (for stakes)
- ❌ `populate-all-utxos.js` (for UTXOs)

Use ONE integrated script:

- ✅ `scan-all-verusids-integrated.js` (for both!)

## Features

### Phase 1: Stake Scanning

- Scans blockchain blocks for PoS (Proof-of-Stake) rewards
- Extracts staking rewards for all known VerusIDs
- Stores in `staking_rewards` table
- Configurable time range (default: last 30 days)

### Phase 2: UTXO Update

- Gets current UTXOs from daemon for each VerusID
- Updates `utxos` table with accurate data
- Marks spent UTXOs
- Calculates eligibility (150+ confirmations)

## Usage

### Basic Usage (Last 30 Days)

```bash
node scripts/scan-all-verusids-integrated.js
```

### Custom Time Range

```bash
# Scan last 90 days
node scripts/scan-all-verusids-integrated.js 90

# Scan last 7 days
node scripts/scan-all-verusids-integrated.js 7

# Scan last 180 days
node scripts/scan-all-verusids-integrated.js 180
```

## Output Example

```
╔═══════════════════════════════════════════════════════════╗
║   Integrated VerusID Scanner: Stakes + UTXOs             ║
╚═══════════════════════════════════════════════════════════╝

📋 Loading VerusIDs from database...
✅ Found 1,234 VerusIDs

⛓️  Getting blockchain height...
✅ Current height: 3,315,952

📅 Configuration:
   Scanning last 30 days for stakes
   Block range: 2,875,952 to 3,315,952 (440,000 blocks)
   VerusIDs: 1,234

═══════════════════════════════════════════════════════════
PHASE 1: SCANNING FOR STAKING REWARDS
═══════════════════════════════════════════════════════════

🔍 Starting block scan for stakes...

📊 Progress: 440000 blocks (100.0%) | Stakes: 15,234 | Rate: 125.3 blk/s | ETA: 0min

✅ Stake scan complete in 58.5 minutes

═══════════════════════════════════════════════════════════
PHASE 2: UPDATING UTXO DATABASE
═══════════════════════════════════════════════════════════

💾 Updating UTXO database...

💾 UTXO Progress: 1234/1234 (100.0%) | UTXOs: 45,678

✅ UTXO update complete in 4.2 minutes

╔═══════════════════════════════════════════════════════════╗
║              INTEGRATED SCAN COMPLETE!                    ║
╚═══════════════════════════════════════════════════════════╝

📊 STAKE SCANNING:
   Blocks scanned: 440,000
   Stakes found: 15,234
   Errors: 0
   Speed: 125.3 blocks/sec

💾 UTXO UPDATE:
   VerusIDs processed: 1,234
   UTXOs updated: 45,678
   Errors: 0

⏱️  TOTAL TIME: 62.7 minutes

✅ Staking rewards added to database!
✅ UTXO database synchronized!

📈 Next step: Run statistics update:
   ./scripts/update-statistics.sh
```

## Performance

### Expected Performance

- **Stake Scanning:** ~100-150 blocks/second
- **UTXO Update:** ~3-5 VerusIDs/second
- **Total Time (30 days, 1000 IDs):** ~60-90 minutes

### Optimization Tips

1. **Shorter Time Range**: Scan 7-14 days for faster execution
2. **Batch Processing**: Script uses efficient batching
3. **RPC Connection**: Ensure daemon is local for best speed

## Database Tables Updated

### 1. `staking_rewards`

Stores historical staking rewards:

- `identity_address`: VerusID I-address
- `block_height`: Block where stake occurred
- `block_time`: Timestamp of block
- `reward_satoshis`: Reward amount in satoshis
- `txid`: Transaction ID of coinstake

### 2. `utxos`

Stores current UTXO state:

- `address`: VerusID I-address
- `txid`, `vout`: UTXO identifier
- `value`: Amount in satoshis
- `is_spent`: Whether UTXO is spent
- `is_eligible`: Whether eligible for staking
- `creation_height`, `creation_time`: UTXO creation info

## After Scanning

Always run the statistics update to recalculate metrics:

```bash
./scripts/update-statistics.sh
```

This updates:

- Total rewards
- Total stakes
- Best/worst months
- APY calculations
- Other aggregated metrics in `verusid_statistics`

## Scheduling (Optional)

Set up a cron job to run daily:

```bash
# Edit crontab
crontab -e

# Add line (runs at 3 AM daily, scans last 7 days)
0 3 * * * cd /home/explorer/verus-dapp && node scripts/scan-all-verusids-integrated.js 7 && ./scripts/update-statistics.sh
```

## Comparison: Old vs New

### OLD APPROACH (Two Scripts)

```bash
# Step 1: Scan for stakes (60 min)
node scripts/scan-all-verusids-for-stakes.js 30

# Step 2: Populate UTXOs (10 min)
node scripts/populate-all-utxos.js

# Step 3: Update stats
./scripts/update-statistics.sh
```

**Total:** ~70 minutes + manual steps

### NEW APPROACH (One Script)

```bash
# All in one (65 min)
node scripts/scan-all-verusids-integrated.js 30

# Update stats
./scripts/update-statistics.sh
```

**Total:** ~65 minutes, fully automated

## Benefits

✅ **Efficiency**: Single pass through VerusIDs  
✅ **Consistency**: Stakes and UTXOs always in sync  
✅ **Simplicity**: One command instead of multiple  
✅ **Completeness**: No missing data between runs  
✅ **Speed**: Optimized batching and parallel processing

## Troubleshooting

### "No stakes found"

- Normal if scanning a short period with few VerusIDs
- Try a longer period: `node scripts/scan-all-verusids-integrated.js 90`

### "RPC connection failed"

- Ensure Verus daemon is running
- Check RPC credentials match daemon config
- Verify port 18843 is correct

### "UTXO errors"

- Usually transient network issues
- Rerun the script to fill gaps
- Check daemon logs for issues

### Slow performance

- Ensure daemon is fully synced
- Run script on same machine as daemon
- Consider shorter time range for faster execution

## Files

- **Main Script:** `scripts/scan-all-verusids-integrated.js`
- **Test Script:** `scripts/test-utxo-population.js`
- **Stats Update:** `scripts/update-statistics.sh`

---

**Status:** Production Ready  
**Recommended Usage:** Run daily with 7-day window  
**Next Action:** Run `node scripts/scan-all-verusids-integrated.js`
