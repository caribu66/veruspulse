# 🔍 Verus Daemon Monitoring Scripts

Two powerful scripts to monitor your Verus daemon's health and initialization status.

---

## 📊 Scripts Overview

### 1. `monitor-verus-daemon.sh` - Continuous Live Monitor

Real-time dashboard that updates every 2 seconds showing:
- ✅ Process status (running, PID, uptime, CPU, memory)
- 🔌 RPC status (ready, loading, error states)
- ⛓️ Blockchain sync status (blocks, headers, progress)
- 🌐 Network information (connections, version)
- ⚒️ Mining/staking metrics (hashrate, difficulty, mempool)

**Perfect for:**
- Watching daemon initialization after restart
- Monitoring sync progress
- Debugging RPC issues
- Keeping an eye on system resources

### 2. `check-daemon-status.sh` - Quick Status Check

Single snapshot showing:
- Process running status
- RPC availability
- Current block height
- Sync status

**Perfect for:**
- Quick health checks
- Scripts and automation
- Troubleshooting

---

## 🚀 Usage

### Continuous Monitoring (Live Dashboard)

```bash
# Run the continuous monitor
./scripts/monitor-verus-daemon.sh

# The screen will update every 2 seconds
# Press Ctrl+C to exit
```

**What you'll see:**

```
╔════════════════════════════════════════════════════════════════╗
║           Verus Daemon Monitor - Live Status                  ║
╚════════════════════════════════════════════════════════════════╝

━━━ Process Status ━━━
  Status:      ● RUNNING
  PID:         123456
  Uptime:      2h 15m
  CPU Usage:   109.2%
  Memory:      35.8%

━━━ RPC Status ━━━
  Status:      ⟳ LOADING
  Description: Loading block index from disk...
  RPC Host:    http://127.0.0.1:18843
  Connections: 262

━━━ Blockchain Status ━━━
  Sync Status: ✓ SYNCED
  Chain:       main
  Blocks:      3777010 / 3777010 (100.00%)
  Progress:    100.0000%
  Best Block:  00000000000045ab...
  Difficulty:  31,813,098,085
  Size:        10.45 GB

━━━ Network Status ━━━
  Version:     2000753 (/MagicBean:2.0.7-3/)
  Protocol:    170010
  Connections: 8
  Time Offset: 0s

━━━ Mining/Staking Status ━━━
  Blocks:      3777010
  Difficulty:  31,813,098,085
  Hashrate:    2.45 TH/s
  Mempool:     15 txs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Updated: 2025-10-19 14:30:45
  Press Ctrl+C to exit
```

### Quick Status Check

```bash
# One-time status snapshot
./scripts/check-daemon-status.sh
```

**Example output:**

```
Verus Daemon Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Process Running (PID: 123456)

Testing RPC Connection...
✓ RPC Ready

Chain:    main
Blocks:   3777010 / 3777010
Progress: 100.0000%
Status:   ✓ FULLY SYNCED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For continuous monitoring, run:
  ./scripts/monitor-verus-daemon.sh
```

---

## 🎯 Common Use Cases

### 1. After Daemon Restart

```bash
# Start monitoring immediately after restart
sudo systemctl restart verusd
./scripts/monitor-verus-daemon.sh
```

Watch the daemon progress through:
1. ⟳ **LOADING** - Loading block index (1-5 minutes)
2. ⟳ **ACTIVATING** - Activating best chain (few seconds)
3. ✓ **READY** - Fully initialized and accepting RPC

### 2. Checking Sync Status

```bash
# Quick check if you're synced
./scripts/check-daemon-status.sh

# Watch sync progress in real-time
./scripts/monitor-verus-daemon.sh
```

### 3. Debugging "Work Queue Full" Errors

```bash
# Monitor RPC connections and queue status
./scripts/monitor-verus-daemon.sh

# Look for:
#   Status: ⚠ QUEUE FULL
#   Connections: 262  (if > rpcworkqueue setting)
```

If you see this:
- Check `~/.komodo/VRSC/VRSC.conf` for `rpcworkqueue` setting
- Increase to 512 or 1024
- Add `rpcthreads=16` if not present
- Restart daemon

### 4. Automation & Scripts

```bash
# Wait for daemon to be ready before running commands
while true; do
  STATUS=$(./scripts/check-daemon-status.sh 2>&1 | grep "RPC Ready")
  if [ -n "$STATUS" ]; then
    echo "Daemon is ready!"
    break
  fi
  echo "Waiting for daemon..."
  sleep 5
done

# Now run your RPC commands
curl --user verus:verus ...
```

---

## 🎨 Status Indicators

### Process States
- `● RUNNING` 🟢 - Daemon process is running
- `● STOPPED` 🔴 - Daemon is not running

### RPC States
- `✓ READY` 🟢 - Fully initialized, accepting all RPC calls
- `⟳ LOADING` 🟡 - Loading block index from disk
- `⟳ ACTIVATING` 🟡 - Activating best chain
- `⟳ RESCANNING` 🟡 - Rescanning blockchain
- `⟳ VERIFYING` 🟡 - Verifying blocks
- `⚠ QUEUE FULL` 🔴 - Work queue exceeded
- `✗ ERROR` 🔴 - RPC error occurred
- `? UNKNOWN` 🟣 - Cannot determine state

### Sync States
- `✓ SYNCED` 🟢 - Blockchain fully synced
- `⟳ SYNCING` 🟡 - Currently syncing (shows blocks behind)

---

## ⚙️ Configuration

Both scripts use environment variables for RPC configuration:

```bash
# Set custom RPC credentials
export VERUS_RPC_USER="myuser"
export VERUS_RPC_PASSWORD="mypassword"
export VERUS_RPC_HOST="http://192.168.1.100:18843"

# Run monitor
./scripts/monitor-verus-daemon.sh
```

**Defaults:**
- `VERUS_RPC_USER`: `verus`
- `VERUS_RPC_PASSWORD`: `verus`
- `VERUS_RPC_HOST`: `http://127.0.0.1:18843`

### Changing Update Interval

Edit `monitor-verus-daemon.sh` and change:

```bash
# Update every 5 seconds instead of 2
UPDATE_INTERVAL=5
```

---

## 🛠️ Dependencies

Both scripts require:

```bash
# Install on Ubuntu/Debian
sudo apt-get install jq bc curl

# Install on macOS
brew install jq bc curl
```

---

## 📝 Example Scenarios

### Scenario 1: Daemon Won't Start

```bash
# Check if process is running
./scripts/check-daemon-status.sh

# If not running:
#   ✗ Process Not Running
#   Check logs: tail -f ~/.komodo/VRSC/debug.log
#   Try starting: verusd -daemon
```

### Scenario 2: RPC Calls Timing Out

```bash
# Monitor RPC status
./scripts/monitor-verus-daemon.sh

# Look at RPC Status section:
#   If "LOADING" - wait for initialization
#   If "QUEUE FULL" - increase rpcworkqueue
#   If "ERROR" - check error message
```

### Scenario 3: Checking After Config Changes

```bash
# After editing VRSC.conf
verus stop
sleep 5
verusd -daemon

# Watch initialization with new settings
./scripts/monitor-verus-daemon.sh

# Verify new settings are working:
#   - Check RPC Connections count
#   - Verify no QUEUE FULL errors
#   - Monitor CPU/Memory usage
```

---

## 🐛 Troubleshooting

### Script Shows "jq: command not found"

```bash
sudo apt-get install jq
```

### Script Shows "bc: command not found"

```bash
sudo apt-get install bc
```

### Colors Not Showing Properly

Some terminals don't support colors. The scripts will still work, just without formatting.

### Permission Denied

```bash
chmod +x scripts/*.sh
```

---

## 💡 Tips

1. **Run in tmux/screen** - Keep monitor running in background session
2. **Pipe to file** - Save output: `./scripts/check-daemon-status.sh > status.log`
3. **Combine with watch** - `watch -n 10 ./scripts/check-daemon-status.sh`
4. **Add to PATH** - Link to `/usr/local/bin` for system-wide access
5. **Systemd Integration** - Monitor daemon health in systemd service

---

## 🔗 Related

- **Daemon Config**: `~/.komodo/VRSC/VRSC.conf`
- **Debug Logs**: `~/.komodo/VRSC/debug.log`
- **RPC Commands**: [Verus RPC Documentation](https://verus.io/developers)

---

**Happy Monitoring! 🎉**

