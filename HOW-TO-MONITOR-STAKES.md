# 📊 How to Monitor Stake Capture System

## Quick Status Checks

### 1. Watch Live Logs (Best for Real-Time Monitoring)

```bash
# Watch the stake update logs in real-time
tail -f /tmp/stake-updates.log
```

**What to look for:**
- `New stakes found: X` - Shows new stakes captured
- `Blocks processed: X` - Shows it's scanning blocks
- `PoS blocks: X` - Shows Proof-of-Stake blocks found
- No error messages

**Example output:**
```
📊 Last scanned block: 3793224
🔍 Scanning blocks: 3793225 to 3793226
New stakes found: 2
Blocks processed: 2
PoS blocks: 1
```

---

### 2. Check if Cron Job is Running

```bash
# Verify cron job exists
crontab -l | grep update-stakes

# Check recent cron executions
grep "update-stakes" /var/log/syslog | tail -10

# Or check if the script has run recently
ls -lh /tmp/stake-updates.log
```

**Expected:** `* * * * * /home/explorer/verus-dapp/scripts/run-update-stakes.sh`

---

### 3. Compare Database vs Blockchain Height

```bash
# Get current blockchain height
/home/explorer/verus-cli/verus getblockcount

# Get last scanned block in database
cd /home/explorer/verus-dapp && \
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db \
  -c "SELECT MAX(block_height) as db_height FROM staking_rewards;"
```

**Expected:** Database should be within 1-5 blocks of blockchain height

---

### 4. Check Most Recent Stakes

```bash
# See the 10 most recent stakes captured
cd /home/explorer/verus-dapp && \
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db << 'EOF'
SELECT 
  i.base_name || '.VRSC@' as verusid,
  sr.block_height,
  sr.block_time,
  sr.amount_sats / 100000000.0 as reward_vrsc,
  NOW() - sr.block_time as time_ago
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
ORDER BY sr.block_time DESC
LIMIT 10;
EOF
```

**What to look for:** Recent timestamps (minutes/hours ago, not days)

---

### 5. Monitor Specific VerusID

```bash
# Check stakes for a specific VerusID (replace with actual name)
cd /home/explorer/verus-dapp && \
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db << 'EOF'
SELECT 
  block_height,
  block_time,
  amount_sats / 100000000.0 as reward_vrsc,
  NOW() - block_time as time_ago
FROM staking_rewards sr
JOIN identities i ON sr.identity_address = i.identity_address
WHERE i.base_name = 'staker'  -- Change this to any VerusID
ORDER BY block_time DESC
LIMIT 10;
EOF
```

---

### 6. Test the API

```bash
# Check leaderboard API (should show recent times)
curl -s http://localhost:3000/api/verusids/staking-leaderboard?limit=5 | \
  jq '.data.leaderboard[] | {name: .friendlyName, lastStake: .lastStake}'

# Or simpler format
curl -s http://localhost:3000/api/verusids/staking-leaderboard?limit=5 | \
  jq -r '.data.leaderboard[] | "\(.friendlyName): \(.lastStake)"'
```

**Expected:** Last stake times should be recent (hours, not days)

---

## 🔴 Live Monitoring Dashboard

### Watch Everything at Once

```bash
# Create a monitoring script
cat > /home/explorer/verus-dapp/scripts/monitor-stakes.sh << 'EOFSCRIPT'
#!/bin/bash

while true; do
  clear
  echo "===================================================================="
  echo "  VerusPulse Stake Monitoring Dashboard"
  echo "  $(date)"
  echo "===================================================================="
  echo ""
  
  # Blockchain vs Database
  CHAIN_HEIGHT=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
  DB_HEIGHT=$(PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
  BEHIND=$((CHAIN_HEIGHT - DB_HEIGHT))
  
  echo "📊 Sync Status:"
  echo "   Blockchain Height: $CHAIN_HEIGHT"
  echo "   Database Height:   $DB_HEIGHT"
  echo "   Blocks Behind:     $BEHIND"
  echo ""
  
  # Recent stakes
  echo "🆕 Last 5 Stakes Captured:"
  PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t << 'EOF'
SELECT 
  '   ' || COALESCE(i.base_name || '.VRSC@', SUBSTRING(sr.identity_address, 1, 12) || '...') || 
  ' - ' || TO_CHAR(sr.block_time, 'HH24:MI:SS') || 
  ' (' || EXTRACT(EPOCH FROM (NOW() - sr.block_time))/60 || ' min ago)'
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
ORDER BY sr.block_time DESC
LIMIT 5;
EOF
  
  echo ""
  echo "📝 Last Log Entry:"
  tail -3 /tmp/stake-updates.log 2>/dev/null | head -2
  
  echo ""
  echo "===================================================================="
  echo "Press Ctrl+C to exit | Refreshing every 10 seconds..."
  sleep 10
done
EOFSCRIPT

chmod +x /home/explorer/verus-dapp/scripts/monitor-stakes.sh
```

**Run it:**
```bash
bash /home/explorer/verus-dapp/scripts/monitor-stakes.sh
```

This gives you a live-updating dashboard showing:
- Sync status (how far behind blockchain)
- Last 5 stakes captured
- Most recent log entries

---

## 🚨 Troubleshooting

### If No New Stakes Are Being Captured:

**1. Check if cron is running:**
```bash
service cron status
# Or
systemctl status cron
```

**2. Run the script manually to see errors:**
```bash
cd /home/explorer/verus-dapp && bash scripts/run-update-stakes.sh
```

**3. Check for errors in logs:**
```bash
grep -i error /tmp/stake-updates.log | tail -10
```

**4. Verify Verus daemon is running:**
```bash
/home/explorer/verus-cli/verus getinfo
```

**5. Check database connection:**
```bash
cd /home/explorer/verus-dapp && \
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -c "SELECT 1;"
```

---

## ✅ Health Indicators

### System is Working if:

- ✅ Cron job is scheduled (`crontab -l`)
- ✅ Log file is being updated (`ls -lh /tmp/stake-updates.log`)
- ✅ Database is within 5 blocks of blockchain
- ✅ Recent stakes show times from last few hours
- ✅ No error messages in logs
- ✅ API returns recent "lastStake" times

### Red Flags:

- ❌ Database is 100+ blocks behind
- ❌ No stakes captured in last hour
- ❌ Error messages in logs
- ❌ Log file not updating
- ❌ All "lastStake" times are days old

---

## Quick Commands Summary

```bash
# Live log watch
tail -f /tmp/stake-updates.log

# Check how far behind
echo "Chain: $(/home/explorer/verus-cli/verus getblockcount), DB: $(PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t -c 'SELECT MAX(block_height) FROM staking_rewards;' | tr -d ' ')"

# See recent stakes
PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db \
  -c "SELECT block_time, block_height FROM staking_rewards ORDER BY block_time DESC LIMIT 5;"

# Test API
curl -s http://localhost:3000/api/verusids/staking-leaderboard?limit=3 | jq .

# Run script manually
bash /home/explorer/verus-dapp/scripts/run-update-stakes.sh
```

---

## Automated Monitoring

### Set up alerts (optional)

Create a simple monitoring script that alerts if system is lagging:

```bash
cat > /home/explorer/verus-dapp/scripts/check-stake-health.sh << 'EOF'
#!/bin/bash

CHAIN_HEIGHT=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
DB_HEIGHT=$(PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
BEHIND=$((CHAIN_HEIGHT - DB_HEIGHT))

if [ $BEHIND -gt 50 ]; then
  echo "⚠️  WARNING: Database is $BEHIND blocks behind!"
  echo "   Chain: $CHAIN_HEIGHT, DB: $DB_HEIGHT"
  exit 1
else
  echo "✅ Stake monitoring healthy ($BEHIND blocks behind)"
  exit 0
fi
EOF

chmod +x /home/explorer/verus-dapp/scripts/check-stake-health.sh

# Add to cron to check every hour
# crontab -e
# 0 * * * * /home/explorer/verus-dapp/scripts/check-stake-health.sh >> /tmp/stake-health.log 2>&1
```

---

**Now you can monitor your stake capture system in real-time! 🎉**

