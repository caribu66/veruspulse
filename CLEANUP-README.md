# Process Cleanup Guide

This guide helps ensure no processes are left running when you close Cursor, preventing unnecessary RAM consumption.

## 🎯 Quick Cleanup

### Option 1: Manual Cleanup (Recommended)

Run this command before closing Cursor:

```bash
npm run cleanup
```

Or directly:

```bash
bash scripts/cleanup-on-cursor-exit.sh
```

### Option 2: Stop All Services

To stop all background services and processes:

```bash
npm run services:stop
```

## 🔧 Automatic Cleanup

### For Terminal Users

If you work primarily in the terminal, you can add automatic cleanup by adding this to your `~/.bashrc`:

```bash
# Auto-cleanup verus-dapp processes on terminal exit
if [ -d ~/verus-dapp ]; then
    trap 'bash ~/verus-dapp/scripts/cleanup-on-cursor-exit.sh 2>/dev/null &' EXIT
fi
```

Then reload your terminal:

```bash
source ~/.bashrc
```

## 📋 What Gets Cleaned Up

The cleanup scripts will stop:

- ✅ Next.js dev server (`next dev`)
- ✅ Next.js production server (`next start`)
- ✅ npm processes related to the project
- ✅ Daemon monitors
- ✅ Stake monitors
- ✅ VerusID sync processes
- ✅ UTXO auto-updaters
- ✅ All lock files

## 🔍 Check Running Processes

To see what's currently running:

```bash
# Check all services
npm run services:status

# Check Node.js processes
ps aux | grep -E 'node|next|npm' | grep -v grep

# Check project-specific processes
lsof -t ~/verus-dapp 2>/dev/null | xargs ps -p 2>/dev/null
```

## ⚡ Best Practices

1. **Before closing Cursor**: Run `npm run cleanup`
2. **After development**: Run `npm run services:stop`
3. **Check regularly**: Run `ps aux | grep node` to see if processes are lingering
4. **Memory check**: Run `free -h` to check RAM usage

## 🚨 Force Kill Everything

If processes won't stop gracefully:

```bash
# Force stop all node processes (use with caution)
pkill -9 node

# Force stop specific npm processes
pkill -9 -f "npm.*verus-dapp"
```

## 📝 Cursor Settings

To help Cursor clean up better, ensure these settings are enabled in Cursor:

1. **Settings** → **Terminal** → **Integrated: Inherit Env** ✓
2. **Settings** → **Window** → **Close When Empty** ✓

## 💡 Tips

- The `cleanup-on-cursor-exit.sh` script is safe to run anytime
- It only stops processes related to this project
- It won't affect other Node.js projects or system processes
- All cleanup scripts use graceful termination (SIGTERM) before force killing (SIGKILL)

## 🐛 Troubleshooting

### "Permission denied" errors

```bash
chmod +x scripts/cleanup-on-cursor-exit.sh
chmod +x scripts/stop-all-services.sh
```

### Processes still running after cleanup

```bash
# Check what's still running
ps aux | grep -E 'next|npm' | grep verus-dapp | grep -v grep

# Note the PID and kill manually
kill -9 <PID>
```

### High RAM usage even after cleanup

```bash
# Check memory usage
free -h

# Check for zombie processes
ps aux | grep defunct

# Clear system cache (careful!)
sudo sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
```
