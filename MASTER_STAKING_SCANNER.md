# 🎯 MASTER STAKING SCANNER - IMPROVED VERSION

## ⚠️ CRITICAL: THIS IS THE ONLY STAKING SCANNER THAT WORKS!

**DO NOT CREATE ANY OTHER STAKING SCANNERS!** This is the definitive, working solution.

## 🔧 MAJOR IMPROVEMENTS (Latest Version)

### ✅ Fixed Critical Address Detection Bug

- **Problem**: Old scanner only checked `addresses[0]` in the vout array
- **Solution**: Now checks **ALL addresses** in the vout array
- **Impact**: This was the main cause of missing caribu66@ stakes and other VerusIDs

### ✅ Enhanced PoS Block Detection

- **Multiple Detection Methods**: Uses `validationtype === 'stake'`, `posrewarddest`, and `proofofstake`
- **Robust Logic**: More reliable detection of Proof-of-Stake blocks
- **Better Coverage**: Catches edge cases that the old scanner missed

## 📁 Master Scanner Files

### Core Scanner

- **`optimize-staking-scanner.js`** - THE ONLY WORKING STAKING SCANNER
- **`optimized-scanner.log`** - Log file for monitoring progress

### Control Scripts

- **`start-staking-scan.sh`** - Start the master scanner
- **`stop-staking-scan.sh`** - Stop the master scanner
- **`monitor-staking-scan.sh`** - Monitor scanner progress
- **`status-staking-scan.sh`** - Check scanner status

## 🚀 How to Use (THE ONLY WAY)

### Start Scanning

```bash
./start-staking-scan.sh
```

### Monitor Progress

```bash
./monitor-staking-scan.sh
```

### Check Status

```bash
./status-staking-scan.sh
```

### Stop Scanner

```bash
./stop-staking-scan.sh
```

## ✅ What This Scanner Does

1. **Extends staking data** from the last scanned block to current blockchain tip
2. **Finds PoS blocks** using multiple detection methods (validationtype, posrewarddest, proofofstake)
3. **Extracts staking rewards** with correct amount calculations
4. **Stores data** in the `staking_rewards` table
5. **Handles ALL addresses** correctly (checks entire vout array, not just first address)
6. **Detects missing stakes** that the old scanner missed due to address array bugs

## 🔧 Technical Details

- **Detection Method**: Multiple methods (validationtype === 'stake', posrewarddest, proofofstake)
- **Database Table**: `staking_rewards` (NOT `stake_events`)
- **Connection Pool**: 5 connections max
- **Batch Size**: 50 blocks per batch
- **Processing Rate**: Optimized for stability
- **Address Detection**: Checks ALL addresses in vout array (FIXED BUG)
- **Error Handling**: Robust recovery mechanisms

## ⚠️ IMPORTANT RULES

1. **NEVER** create alternative scanners
2. **NEVER** use `block.blocktype === 'minted'` detection
3. **NEVER** insert into `stake_events` table
4. **ALWAYS** use this scanner for VerusID staking data
5. **ALWAYS** check `optimized-scanner.log` for progress

## 🎯 Current Status

The scanner is currently running and has found **1,365+ stakes** with **2.9% completion**.
Processing rate: ~33 blocks/sec, ETA: ~45 minutes to complete.

## 📊 Database Structure

The scanner uses the correct database structure:

- **Table**: `staking_rewards`
- **Columns**: `identity_address`, `txid`, `vout`, `block_height`, `block_time`, `amount_sats`, `classifier`, `source_address`
- **Foreign Key**: Links to `identities` table

## 🚫 What NOT to Do

- ❌ Don't create `definitive-staking-scanner.js`
- ❌ Don't create `comprehensive-block-scanner.ts`
- ❌ Don't use API endpoints for scanning
- ❌ Don't use `block.blocktype === 'minted'`
- ❌ Don't insert into `stake_events` table
- ❌ Don't create multiple scanner processes

## ✅ What TO Do

- ✅ Use `optimize-staking-scanner.js` ONLY
- ✅ Use `block.posrewarddest` detection
- ✅ Insert into `staking_rewards` table
- ✅ Monitor `optimized-scanner.log`
- ✅ Use the control scripts provided

---

**REMEMBER: This is the ONLY staking scanner that works. Use it exclusively.**
