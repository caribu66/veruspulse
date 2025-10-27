# 🚨 CRITICAL RULES FOR STAKING SCANNER

## ⚠️ FOR AI ASSISTANTS - READ THIS FIRST!

When the user asks about VerusID staking scanning, **ALWAYS** use the master scanner system. **NEVER** create new scanners or scripts.

## 🎯 THE ONLY WORKING SOLUTION

**File**: `optimize-staking-scanner.js`
**Detection Method**: `block.posrewarddest`
**Database Table**: `staking_rewards`
**Control Scripts**: `start-staking-scan.sh`, `stop-staking-scan.sh`, `monitor-staking-scan.sh`, `status-staking-scan.sh`

## 🚫 NEVER CREATE THESE

- ❌ `definitive-staking-scanner.js`
- ❌ `comprehensive-block-scanner.ts`
- ❌ `staking-scanner.js`
- ❌ Any other scanner variations
- ❌ API-based scanning solutions
- ❌ Database scanning scripts

## ✅ ALWAYS USE THESE

- ✅ `optimize-staking-scanner.js` - THE ONLY WORKING SCANNER
- ✅ `block.posrewarddest` detection method
- ✅ `staking_rewards` table for storage
- ✅ Control scripts for management

## 📋 USER COMMANDS

When user asks to scan staking data:

1. Check if scanner is running: `./status-staking-scan.sh`
2. If not running, start it: `./start-staking-scan.sh`
3. Monitor progress: `./monitor-staking-scan.sh`

## 🔧 TECHNICAL SPECIFICATIONS

- **Detection**: `block.posrewarddest` (NOT `block.blocktype === 'minted'`)
- **Database**: `staking_rewards` table (NOT `stake_events`)
- **Addresses**: I-addresses only for VerusID scanning
- **Performance**: ~33-37 blocks/sec processing rate
- **Batching**: 100 blocks per batch with 500ms delays

## 📊 CURRENT STATUS

The master scanner is currently running and has found 1,365+ stakes with 2.9% completion.

---

**REMEMBER: This is the ONLY staking scanner that works. Use it exclusively.**
