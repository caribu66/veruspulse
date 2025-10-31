# Stake Monitoring System - Fixed

## Problem Identified

The "Last" stake times in the leaderboard were **showing accurate data** - some stakers like `whale.VRSC@` and `inverse.VRSC@` genuinely hadn't staked in 18 days. However, the database was falling behind by ~10-20 blocks because the automated update script wasn't running.

## Root Cause

1. **No continuous monitoring process was running** to capture new stakes from the blockchain
2. The `update-new-stakes.js` script had **hardcoded wrong database credentials**
3. No cron job or systemd service was set up to automatically update stakes

## What Was Fixed

### 1. Fixed Database Credentials
Updated `/home/explorer/verus-dapp/scripts/update-new-stakes.js` to use the `DATABASE_URL` environment variable instead of hardcoded credentials.

**Before:**
```javascript
this.pool = new Pool({
  connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
```

**After:**
```javascript
this.pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
```

### 2. Created Wrapper Script
Created `/home/explorer/verus-dapp/scripts/run-update-stakes.sh` to properly load environment variables:
```bash
#!/bin/bash
cd /home/explorer/verus-dapp
source .env
export DATABASE_URL
/usr/bin/node scripts/update-new-stakes.js >> /tmp/stake-updates.log 2>&1
```

### 3. Set Up Cron Job
Added a cron job to run every minute:
```bash
* * * * * /home/explorer/verus-dapp/scripts/run-update-stakes.sh
```

## How It Works Now

1. **Every minute**, the cron job runs `update-new-stakes.js`
2. The script:
   - Queries the database for the last scanned block height
   - Gets the current blockchain height from the Verus daemon
   - Scans any new blocks for PoS stakes
   - Extracts stakes that pay to VerusID I-addresses
   - Updates the `staking_rewards` table
   - Updates `verusid_statistics.last_stake_time` for affected IDs

3. The **leaderboard API** queries directly from `staking_rewards` table:
   ```sql
   SELECT 
     identity_address,
     MAX(block_time) as last_stake_time
   FROM staking_rewards
   GROUP BY identity_address
   ```

## Current Status

✅ **Database**: Up to date (within 1-2 blocks of chain tip)
✅ **Cron Job**: Running every minute
✅ **Last Stake Times**: Accurate and auto-updating

### Verification Commands

```bash
# Check if cron is running
crontab -l | grep update-stakes

# View recent logs
tail -f /tmp/stake-updates.log

# Check database status
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db \
  -c "SELECT MAX(block_height) as db_height FROM staking_rewards;"

# Compare with blockchain
/home/explorer/verus-cli/verus getblockcount
```

## Specific Entities Mentioned

From the leaderboard screenshot, the last stake times are ACCURATE:

- **whale.VRSC@**: Oct 12, 06:14 (18 days ago) ✅ Correct - genuinely hasn't staked recently
- **inverse.VRSC@**: Oct 12, 04:19 (18 days ago) ✅ Correct - genuinely hasn't staked recently  
- **staker.VRSC@**: Oct 30, 18:01 (hours ago) ✅ Active staker
- **RockPi.VRSC@**: Oct 30, 19:47 (hours ago) ✅ Active staker
- **cyberware.VRSC@**: Oct 30, 17:33 (hours ago) ✅ Active staker

The entities showing "18 days ago" are not staking frequently or may have reduced staking weight. The automated system is now capturing all recent stakes every minute.

## Monitoring

Log files to watch:
- `/tmp/stake-updates.log` - Update script output
- Check cron execution: `grep CRON /var/log/syslog | grep update-stakes`

---

**Fixed**: October 30, 2025, 21:50 UTC




