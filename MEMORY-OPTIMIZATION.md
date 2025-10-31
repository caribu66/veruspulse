# Node.js Memory Optimization Guide

## 🔍 Problem Identified

Your system was experiencing high memory usage (14GB/31GB + 4.7GB swap) caused by **32 zombie Next.js worker processes** (`jest-worker/processChild.js`), each consuming 97-99% CPU.

## ✅ Fixes Applied

### 1. **Killed Zombie Processes**

- Identified and terminated 32 zombie `jest-worker/processChild` processes
- **Result:** Freed ~2GB of RAM immediately (14Gi → 12Gi used, 7.3Gi → 9.3Gi free)

### 2. **Node.js Memory Limits**

Updated all development scripts with explicit memory limits:

```json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' node scripts/check-port-and-dev.js"
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

- Sets Node.js heap size to 4GB (4096MB)
- Prevents excessive memory growth
- Adjust to 2048 (2GB) if still experiencing issues

### 3. **Webpack Optimization**

Enhanced `next.config.js` with aggressive memory management:

- Filesystem caching with `maxMemoryGenerations: 1`
- Optimized chunk management (`removeAvailableModules`, `mergeDuplicateChunks`)
- Reduced logging (`stats: 'errors-only'`)
- Faster page unloading (`maxInactiveAge: 15s` instead of 25s)

### 4. **Automatic Zombie Cleanup**

Created scripts to prevent zombie processes:

- `scripts/kill-zombie-workers.sh` - Standalone zombie killer
- Updated `stop-dev-server.js` - Kills zombies on dev server stop
- Updated `cleanup-on-cursor-exit.sh` - Kills zombies on Cursor exit

## 🚀 New Commands Available

### Memory Management

```bash
# Check and optimize memory
npm run memory:optimize

# Kill zombie worker processes
npm run memory:kill-zombies

# Stop dev server (now includes zombie cleanup)
npm run dev:stop
```

### When to Use

- **Daily**: Run `npm run memory:kill-zombies` if system feels slow
- **After crashes**: Run `npm run memory:optimize` to clean cache
- **Before builds**: Ensure zombies are killed for clean builds

## 🔧 Additional Optimizations

### 1. Reduce Memory Limit (if needed)

If you're still running out of memory, lower the limit in `package.json`:

```bash
NODE_OPTIONS='--max-old-space-size=2048'  # 2GB instead of 4GB
```

### 2. Use Regular Development Mode

Avoid turbo mode if memory is tight:

```bash
npm run dev        # ✅ Regular (lower memory)
npm run dev:turbo  # ⚠️ Turbo (higher memory)
```

### 3. Clear Cache Regularly

```bash
npm run clean      # Clear .next and cache
npm run reinstall  # Full clean + reinstall (if needed)
```

### 4. Monitor Processes

Check for zombie processes:

```bash
# Count zombie workers
ps aux | grep "jest-worker/processChild" | grep -v grep | wc -l

# Kill them manually
pkill -9 -f "jest-worker/processChild"

# Or use the script
npm run memory:kill-zombies
```

### 5. Increase Swap (if low on RAM)

If you have less than 8GB physical RAM:

```bash
# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent (add to /etc/fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 📊 Current Memory Status

After fixes:

```
Total RAM: 31GB
Used:      12GB (down from 14GB)
Free:      9.3GB (up from 7.3GB)
Swap:      4.7GB used / 8GB total
```

## 🐛 Why Zombie Processes Happen

Next.js spawns worker processes for:

- Parallel compilation
- Code transformations
- Type checking
- Linting

Sometimes these workers don't terminate properly when:

- Dev server crashes
- You force-quit the terminal
- Build process is interrupted
- System runs out of memory

## 🎯 Best Practices

1. **Always stop dev server properly**: `npm run dev:stop`
2. **Restart dev server daily** to prevent memory leaks
3. **Monitor zombie processes** with `npm run memory:kill-zombies`
4. **Clean cache weekly** with `npm run clean`
5. **Close unused browser tabs** during development
6. **Use production mode** for testing: `npm run build && npm run start`

## 🆘 Emergency Memory Relief

If your system is freezing:

```bash
# 1. Kill zombie workers first
pkill -9 -f "jest-worker/processChild"

# 2. Stop dev server
npm run dev:stop

# 3. Clear cache
rm -rf .next node_modules/.cache

# 4. Check memory
free -h

# 5. If still high, restart development
npm run dev
```

## 📈 Monitor Memory Usage

Real-time monitoring:

```bash
# Watch memory every 2 seconds
watch -n 2 'free -h && echo "" && ps aux | grep node | grep -v grep | head -10'

# Check zombie count
watch -n 5 'ps aux | grep "jest-worker" | grep -v grep | wc -l'
```

## 🔗 Related Files

- `next.config.js` - Webpack & memory optimizations
- `package.json` - Memory-limited scripts
- `scripts/kill-zombie-workers.sh` - Zombie process killer
- `scripts/optimize-memory.sh` - Cache cleaner & memory checker
- `scripts/stop-dev-server.js` - Enhanced stop script
- `scripts/cleanup-on-cursor-exit.sh` - Auto-cleanup on exit

---

**Last Updated**: October 31, 2025
**Memory Saved**: ~2GB
**Zombie Processes Killed**: 32
**Status**: ✅ Optimized
