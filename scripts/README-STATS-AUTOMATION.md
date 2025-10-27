# 📊 VerusID Statistics Automation

This directory contains scripts to automatically recalculate VerusID statistics at regular intervals, ensuring your data stays fresh and up-to-date.

## 🚀 Quick Start

### Interactive Setup (Recommended)

```bash
cd /home/explorer/verus-dapp
./scripts/setup-stats-automation.sh
```

This will show you an interactive menu to choose your preferred automation method.

## 📋 Available Methods

### 1. Systemd Service (Recommended)

- **Best for:** Production servers, always-on systems
- **Features:** Auto-restart, boot startup, better logging
- **Setup:** `./scripts/setup-auto-stats-recalc.sh`

### 2. Cron Job (Traditional)

- **Best for:** Simple setups, existing cron users
- **Features:** System cron scheduler, reliable
- **Setup:** `./scripts/setup-cron-stats-recalc.sh`

### 3. Manual Execution

- **Best for:** Testing, one-time updates
- **Command:** `./scripts/recalculate-stats.sh`

## ⚙️ Configuration

### Update Frequency

- **Default:** Every 30 minutes
- **Systemd:** Edit `UPDATE_INTERVAL` in `auto-recalculate-stats.js`
- **Cron:** Edit the cron schedule (e.g., `*/15 * * * *` for 15 minutes)

### Log Files

- **Systemd:** `logs/auto-stats-recalc.log`
- **Cron:** `logs/cron-stats-recalc.log`
- **Lock files:** Prevent overlapping executions

## 🔧 Management Commands

### Systemd Service

```bash
# Check status
sudo systemctl status verus-stats-recalc

# View logs
sudo journalctl -u verus-stats-recalc -f

# Start/stop/restart
sudo systemctl start verus-stats-recalc
sudo systemctl stop verus-stats-recalc
sudo systemctl restart verus-stats-recalc

# Enable/disable on boot
sudo systemctl enable verus-stats-recalc
sudo systemctl disable verus-stats-recalc
```

### Cron Job

```bash
# View cron jobs
crontab -l

# Edit cron jobs
crontab -e

# View logs
tail -f logs/cron-stats-recalc.log
```

## 📊 Monitoring

### Check Recent Activity

```bash
# View recent recalculation runs
grep "Starting" logs/auto-stats-recalc.log | tail -10

# Check for errors
grep "failed\|error" logs/auto-stats-recalc.log | tail -5

# View statistics summary
grep "Statistics updated" logs/auto-stats-recalc.log | tail -5
```

### Verify Data Freshness

```bash
# Check when statistics were last updated
curl -s "http://localhost:3000/api/verusids/browse?sort=recent&limit=1" | jq '.data.identities[0].lastRefreshed'
```

## 🛠️ Troubleshooting

### Service Not Starting

```bash
# Check service status
sudo systemctl status verus-stats-recalc

# View detailed logs
sudo journalctl -u verus-stats-recalc --no-pager

# Check for lock files
ls -la logs/*.lock
```

### Cron Job Not Running

```bash
# Verify cron job exists
crontab -l | grep cron-recalc-stats

# Check cron service
sudo systemctl status cron

# Test manual execution
./scripts/cron-recalc-stats.sh
```

### Database Connection Issues

```bash
# Test database connection
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT COUNT(*) FROM verusid_statistics;"

# Check environment variables
echo $DATABASE_URL
```

## 🔄 What Gets Updated

The automation recalculates these statistics from the raw `staking_rewards` data:

- **Total stakes count**
- **Total rewards (VRSC)**
- **First stake time**
- **Last stake time** ⭐ (This fixes the "over 2 years ago" issue)
- **Average reward amount**
- **Highest/lowest rewards**
- **Network rankings**
- **APY calculations**

## 📈 Performance Impact

- **Duration:** ~10-30 seconds for 191 VerusIDs
- **Database load:** Minimal (runs during off-peak)
- **Lock mechanism:** Prevents overlapping executions
- **Frequency:** Every 30 minutes (configurable)

## 🎯 Benefits

1. **Always Fresh Data:** No more "over 2 years ago" timestamps
2. **Automatic Updates:** No manual intervention required
3. **Reliable:** Lock files prevent conflicts
4. **Monitored:** Comprehensive logging and status checking
5. **Flexible:** Multiple setup options for different environments

## 🚨 Important Notes

- **Lock Files:** The system uses lock files to prevent overlapping executions
- **Stale Locks:** Locks older than 2 hours are automatically removed
- **Log Rotation:** Consider setting up log rotation for long-running systems
- **Backup:** Always backup your database before major changes

## 📞 Support

If you encounter issues:

1. Check the log files for error messages
2. Verify database connectivity
3. Ensure all scripts are executable
4. Check system resources (disk space, memory)

For persistent issues, check the main project documentation or create an issue in the repository.
