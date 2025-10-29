# 🔄 Automatic Last Stake Time Updates

## Summary

The system now automatically updates `last_stake_time` for all VerusIDs every 15 minutes, so users can see their most recent staking activity in real-time.

## How It Works

### 1. **Stake Scanning** (ongoing)

- `ultra-fast-scanner.js` continuously scans for new stakes
- New stakes are inserted into `staking_rewards` table
- This happens automatically in the background

### 2. **Statistics Updates** (every 15 minutes)

- `update-last-stake-time.js` runs via cron job
- Syncs `verusid_statistics.last_stake_time` from `staking_rewards`
- Updates counts and totals as well

### 3. **API Display** (real-time)

- The browse API queries `staking_rewards` directly
- Uses `COALESCE(sr_recent.last_stake_time, s.last_stake_time)`
- Always shows the most recent data available

## Configuration

### Cron Schedule

```
*/15 * * * * /home/explorer/verus-dapp/scripts/cron-update-last-stake.sh
```

### Logs

- Location: `logs/last-stake-update.log`
- View: `tail -f logs/last-stake-update.log`

## Manual Commands

### Update Now

```bash
node scripts/update-last-stake-time.js
```

### View Recent Activity

```bash
tail -20 logs/last-stake-update.log
```

### Check Cron Job

```bash
crontab -l | grep last-stake
```

### Disable Updates

```bash
crontab -e
# Remove the line with "cron-update-last-stake.sh"
```

## Files Created

1. **scripts/update-last-stake-time.js** - Main update script
2. **scripts/setup-last-stake-update.sh** - Setup script
3. **scripts/cron-update-last-stake.sh** - Cron wrapper
4. **logs/last-stake-update.log** - Log file

## Testing

After a new stake is found:

1. It appears in `staking_rewards` immediately
2. Within 15 minutes, it's synced to `verusid_statistics`
3. The browse API shows it right away (queries `staking_rewards`)

## Example Timeline

```
10:00 AM - Staker "whale" gets a new stake
10:00 AM - Stake inserted into staking_rewards ✅
10:15 AM - Statistics updated via cron ✅
10:00-10:15 AM - API shows Oct 29 data (from staking_rewards)
10:15+ AM - Both tables show Oct 29 data
```

## Benefits

1. **Real-time display** - Users see stakes as soon as they're scanned
2. **Accurate statistics** - Stats table stays in sync with rewards
3. **Automatic** - No manual intervention needed
4. **Resilient** - Lock files prevent overlapping updates
