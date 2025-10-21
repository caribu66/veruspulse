# Duplicate Instance Prevention

This document describes how the Verus DApp prevents duplicate service instances from running.

## Overview

The system uses **lock files** to prevent multiple instances of the same service from running simultaneously. Each service creates a lock file containing process information when it starts, and removes it when it stops.

## Lock File Mechanism

### Lock File Locations

All lock files are stored in the project root directory:

```
/home/explorer/verus-dapp/
├── .dev-server.lock          # Development server (npm run dev)
├── .prod-server.lock         # Production server (npm start)
├── .daemon-monitor.lock      # Daemon monitoring service
├── .stake-monitor.lock       # Stake monitoring service
└── .verusid-sync.lock        # VerusID sync service
```

### Lock File Format

Lock files contain JSON with process information:

```json
{
  "pid": 12345,
  "port": 3000,
  "mode": "development",
  "started": "2025-10-19T10:30:00.000Z"
}
```

## Services with Duplicate Prevention

### 1. Development Server

**Command:** `npm run dev`
**Script:** `scripts/check-port-and-dev.js`
**Lock File:** `.dev-server.lock`

Checks:

- ✅ Lock file exists and process is running
- ✅ Port 3000 is available
- ✅ Removes stale lock files automatically

Stop with:

```bash
npm run dev:stop
```

### 2. Production Server

**Command:** `npm start`
**Script:** `scripts/check-port-and-start.js`
**Lock File:** `.prod-server.lock`

Checks:

- ✅ Lock file exists and process is running
- ✅ Port 3000 (or custom PORT) is available
- ✅ Removes stale lock files automatically

Stop with:

```bash
npm run stop
```

### 3. Daemon Monitor

**Script:** `scripts/start-daemon-monitor.sh`
**Lock File:** `.daemon-monitor.lock`

Checks:

- ✅ Lock file exists and process is running
- ✅ Removes stale lock files automatically

Stop with:

```bash
kill $(cat .daemon-monitor.lock)
```

### 4. Stake Monitor

**Script:** `scripts/start-stake-monitor.sh`
**Lock File:** `.stake-monitor.lock`

Checks:

- ✅ Lock file exists and process is running
- ✅ Removes stale lock files automatically

Stop with:

```bash
kill $(cat .stake-monitor.lock)
```

### 5. VerusID Sync

**Script:** `start-verusid-sync.sh` (enhanced version in scripts/)
**Lock File:** `.verusid-sync.lock`

Checks:

- ✅ Lock file exists and process is running
- ✅ Removes stale lock files automatically

## Management Scripts

### Check All Services

```bash
./scripts/status-all-services.sh
```

Shows:

- Running services with PID and uptime
- Stale lock files
- Services without lock files
- Processes running by name

### Stop All Services

```bash
./scripts/stop-all-services.sh
```

Stops:

- All services with lock files
- Additional cleanup by process name
- Removes all lock files
- Shows final status

### Stop Specific Service

```bash
# Development server
npm run dev:stop

# Production server
npm run stop

# All servers (dev + prod)
node scripts/stop-server.js

# Daemon monitor
kill $(cat .daemon-monitor.lock)

# Stake monitor
kill $(cat .stake-monitor.lock)
```

## How It Works

### 1. Start Process

```
1. Check if lock file exists
2. If exists, read PID from lock file
3. Check if PID is still running (kill -0 PID)
4. If running → EXIT with error message
5. If not running → Remove stale lock file
6. Check if port is available (for servers)
7. Start the service
8. Create lock file with PID and info
9. Setup cleanup handlers (SIGINT, SIGTERM, exit)
```

### 2. Stop Process

```
1. Read lock file
2. Extract PID
3. Send SIGTERM to PID
4. Wait for graceful shutdown
5. If still running, send SIGKILL
6. Remove lock file
```

### 3. Stale Lock Cleanup

A lock file is considered "stale" when:

- The file exists
- But the process (PID) is not running

All start scripts automatically detect and remove stale locks.

## Benefits

✅ **Prevents Port Conflicts** - No duplicate servers on same port  
✅ **Prevents Resource Conflicts** - No duplicate monitors or sync processes  
✅ **Automatic Cleanup** - Stale locks removed automatically  
✅ **Clear Error Messages** - Shows PID and how to stop existing instance  
✅ **Graceful Shutdown** - Lock files cleaned up on exit  
✅ **Cross-Script Coordination** - All services use same mechanism

## Troubleshooting

### "Server already running" but nothing seems to be running

```bash
# Check if process actually exists
ps aux | grep next

# Remove stale lock file manually
rm .dev-server.lock .prod-server.lock

# Or use status script
./scripts/status-all-services.sh
```

### Lock file not removed after crash

```bash
# Clean all lock files
rm .*.lock

# Or use stop script
./scripts/stop-all-services.sh
```

### Multiple processes without lock files

```bash
# Kill all Next.js processes
pkill -f "next dev"
pkill -f "next start"

# Clean up
./scripts/stop-all-services.sh
```

### Check what's using a port

```bash
# Check port 3000
lsof -i :3000
netstat -tlnp | grep 3000

# Kill process on port
kill $(lsof -ti:3000)
```

## Best Practices

1. **Always use provided start scripts** - They handle locking automatically
2. **Use provided stop scripts** - They clean up lock files properly
3. **Check status before starting** - Use `status-all-services.sh`
4. **Don't manually kill processes** - Use stop scripts to ensure cleanup
5. **Clean locks after crashes** - Run `stop-all-services.sh` after system issues

## Migration Notes

### Old Behavior (Before)

- Used `pgrep` to check for running processes
- No automatic stale lock cleanup
- No standardized stopping mechanism
- Each script had different checking logic

### New Behavior (After)

- ✅ Uses lock files with PID tracking
- ✅ Automatic stale lock detection and removal
- ✅ Standardized stop scripts
- ✅ Consistent checking across all services
- ✅ Better error messages with PIDs
- ✅ Centralized management scripts

## Technical Implementation

All scripts use one of:

1. **Node.js Implementation** (servers)
   - `scripts/lib/process-lock.js` - Reusable lock class
   - `scripts/check-port-and-dev.js` - Dev server
   - `scripts/check-port-and-start.js` - Prod server

2. **Bash Implementation** (monitors)
   - Lock file with PID
   - `kill -0 PID` to check if running
   - Automatic stale lock removal
   - SIGTERM for graceful shutdown

## Future Enhancements

Potential improvements:

- [ ] Add systemd service files
- [ ] Add PM2 process management
- [ ] Add health check endpoints
- [ ] Add process monitoring dashboard
- [ ] Add automatic restart on crash
- [ ] Add log rotation
- [ ] Add metrics collection
