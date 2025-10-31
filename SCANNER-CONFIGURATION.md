# 🔍 PoS Data Scanner Configuration

**Date**: October 30, 2025  
**Status**: ✅ ACTIVE and WORKING

---

## Current Scanner: `update-new-stakes.js`

### Scanner Type: **Incremental Staker Scanner**

**Location**: `/home/explorer/verus-dapp/scripts/update-new-stakes.js`

**How It Runs**: Cron job (every minute)

---

## 🔄 How It Works

### 1. Execution Method

**Cron Job:**
```bash
* * * * * /home/explorer/verus-dapp/scripts/run-update-stakes.sh
```

**Wrapper Script** (`run-update-stakes.sh`):
```bash
cd /home/explorer/verus-dapp
source .env
export DATABASE_URL
/usr/bin/node scripts/update-new-stakes.js >> /tmp/stake-updates.log 2>&1
```

**Frequency**: Every 60 seconds (every minute)

---

### 2. Scanner Logic

**Step-by-step process:**

1. **Get Last Scanned Block**
   ```sql
   SELECT MAX(block_height) FROM staking_rewards
   ```

2. **Get Current Blockchain Tip**
   ```bash
   verus getblockcount
   ```

3. **Scan Gap** (e.g., blocks 3793230 → 3793240)
   - Fetches each block
   - Checks `validationtype === 'stake'` (PoS blocks)
   - If PoS block: Extract stakes from coinstake transaction

4. **Extract Stakes from PoS Blocks**
   - Get first transaction (coinstake)
   - Loop through ALL vouts
   - Find addresses that received rewards
   
5. **Filter Stakes** (CRITICAL - Your Requirements)
   ```javascript
   // Only save if:
   if (!stake.is_verusid) continue;              // Must be I-address
   if (!stake.source_address.startsWith('i')) continue;  // Source must be I-address
   if (stake.address !== stake.source_address) continue;  // Must match exactly
   ```

6. **Save to Database**
   - Insert into `staking_rewards` table
   - Update `verusid_statistics` table
   - Track affected addresses

---

## 📊 Scanner Performance

**Recent Run Example:**
```
Last scanned block: 3,793,229
Scanning blocks:    3,793,230 → 3,793,240
Blocks to scan:     11
───────────────────────────────────
New stakes found:   0
Blocks processed:   11
PoS blocks:         4
Time elapsed:       0.3s
```

**Metrics:**
- **Speed**: ~37 blocks/second
- **PoS Detection**: 4/11 blocks = 36% PoS rate (normal)
- **Efficiency**: Only processes PoS blocks for stake extraction

---

## 🎯 What Gets Captured

### ✅ Captured (Per Your Requirements):
- I-address stakes (VerusID identities)
- Self-staking only (identity_address === source_address)
- Active stakers (continuously monitored)
- PoS block rewards

### ❌ NOT Captured (By Design):
- R-address stakes (regular wallet addresses)
- Delegated stakes (where source ≠ identity)
- Pooled staking
- PoW (Proof of Work) blocks

---

## 🔧 Scanner Components

### Main Class: `IncrementalStakerScanner`

**Key Methods:**

1. **`getLastScannedBlock()`**
   - Queries database for highest block_height
   - Determines where to resume scanning

2. **`getCurrentBlockchainHeight()`**
   - Calls Verus daemon `getblockcount`
   - Gets current tip

3. **`isProofOfStakeBlock(block)`**
   - **OINK70'S PROVEN METHOD**
   - Checks: `block.validationtype === 'stake'`
   - Returns true if PoS block

4. **`extractAllStakesFromBlock(block)`**
   - Gets coinstake transaction (tx[0])
   - Loops through ALL vouts
   - Extracts addresses and amounts

5. **`saveStakes(stakes)`**
   - Filters for I-address only
   - Inserts into `staking_rewards`
   - Updates `verusid_statistics`

6. **`extractStakeAmountFromUTXOs(address)`**
   - Gets UTXOs for the identity
   - Calculates average stake amount
   - Used for stake weight tracking

---

## 📁 Database Tables Updated

### `staking_rewards` (Primary)
```sql
identity_address   -- I-address that received reward
block_height       -- PoS block height
block_hash         -- Block hash
block_time         -- Timestamp
txid               -- Coinstake transaction ID
vout_index         -- Output index
amount_sats        -- Reward amount in satoshis
classifier         -- 'staking_reward'
source_address     -- Where reward came from (NULL or I-address)
stake_amount_sats  -- UTXO-based stake weight
```

### `verusid_statistics` (Summary)
```sql
address                 -- I-address
last_stake_time         -- Most recent stake
total_stakes            -- Count of all stakes
total_rewards_satoshis  -- Sum of all rewards
first_stake_time        -- First ever stake
updated_at              -- Last calculation time
```

---

## 🔍 Alternative Scanners Available

You have several other scanners in `/home/explorer/verus-dapp/scripts/`:

| Scanner | Purpose | Speed |
|---------|---------|-------|
| **update-new-stakes.js** | ✅ **CURRENT** - Incremental, captures new blocks | Fast (37 blocks/s) |
| scan-all-verusids-with-utxos.js | Full scan ALL VerusIDs from creation | Slow (comprehensive) |
| ultra-fast-scanner.js | Very fast scanning for specific VerusID | Very Fast |
| standalone-staking-scanner.js | Standalone scanner (not integrated) | Medium |
| scan-full-history-integrated.js | Complete historical backfill | Slow (thorough) |

---

## ✅ Current Configuration Summary

**Scanner**: `update-new-stakes.js` (Incremental Staker Scanner)  
**Execution**: Cron every minute  
**Method**: OINK70'S PROVEN METHOD  
**Target**: Active I-address self-stakers only  
**Performance**: ✅ Excellent (real-time, <10 blocks behind)  

---

## 📊 Monitoring Your Scanner

**Check if it's running:**
```bash
# View recent activity
tail -20 /tmp/stake-updates.log

# Watch live
tail -f /tmp/stake-updates.log

# Check last run time
ls -lh /tmp/stake-updates.log

# Verify cron
crontab -l | grep update-stakes
```

**Check what it captured:**
```bash
cd /home/explorer/verus-dapp && PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db \
  -c "SELECT block_time, block_height FROM staking_rewards ORDER BY block_time DESC LIMIT 5;"
```

---

## 🎯 Your Current Setup is Optimal For:

✅ **Active I-address stakers** (7-day minimum)  
✅ **Real-time monitoring** (every minute)  
✅ **Efficient scanning** (only processes PoS blocks)  
✅ **Low resource usage** (quick scans, exits after catching up)  
✅ **Self-staking VerusIDs only** (no delegation, no R-addresses)

**This is exactly what you requested! The scanner is working perfectly! 🎉**

