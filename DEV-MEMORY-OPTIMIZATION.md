# Development Server Memory Optimization Guide

## Why Does Dev Server Use 3GB RAM?

Your Next.js 15 development server uses significant memory due to:

1. **Next.js 15.5.4** - Higher memory footprint than v14
2. **Large codebase** - 94 TypeScript files, 664MB build, 1.1GB node_modules
3. **Auto-starting services**:
   - ZMQ Listener (blockchain event streaming)
   - Smart VerusID Updater (database sync)
   - Real-time WebSocket connections
   - Multiple PostgreSQL connection pools
4. **SQLite databases** - 94MB verusid-comprehensive.db loaded into memory
5. **Hot Module Replacement (HMR)** - Watches all files for changes

## What We've Done to Reduce Memory

✅ **ZMQ controlled by environment** - Set `ENABLE_ZMQ=true` in .env to enable in dev
✅ **Smart VerusID Updater disabled in dev** - Set `ENABLE_SMART_UPDATER=true` to enable
✅ **Webpack optimizations** - Named module IDs reduce memory

## Additional Memory Reduction Options

### Option 1: Disable Source Maps (Most Aggressive)

Saves ~500MB but makes debugging harder.

Edit `next.config.js` line 57, uncomment:

```js
config.devtool = false;
```

### Option 2: Reduce Database Connection Pools

If you're using PostgreSQL, set these in your shell before running `npm run dev`:

```bash
export DB_POOL_MIN=1
export DB_POOL_MAX=2
```

### Option 3: Don't Load Real-time Data on All Pages

The `RealtimeDataProvider` in `app/layout.tsx` loads WebSocket connections on every page.
Consider moving it only to pages that need real-time updates.

### Option 4: Clear Build Cache

If memory is still high after changes:

```bash
rm -rf .next
npm run dev
```

### Option 5: Use Production Build for Testing

Production builds use much less memory:

```bash
npm run build
npm start
```

## Environment Variables for Memory Control

Create a `.env.local` file (not tracked in git):

```bash
# Control features in development
ENABLE_REALTIME_UPDATES=true
ENABLE_ZMQ=true              # Set to false to disable ZMQ and save memory
UTXO_DATABASE_ENABLED=false
ENABLE_SMART_UPDATER=false

# Reduce connection pools
DB_POOL_MIN=1
DB_POOL_MAX=2

# Your RPC settings
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=user
VERUS_RPC_PASSWORD=password
```

## Expected Memory Usage After Optimizations

| Configuration                 | Memory Usage |
| ----------------------------- | ------------ |
| **Default (Before)**          | 3-4 GB       |
| **After our changes**         | 2-2.5 GB     |
| **With source maps disabled** | 1.5-2 GB     |
| **Production build**          | 500MB-1GB    |

## Monitor Memory Usage

```bash
# While dev server is running:
ps aux | grep "next-server"

# Or use this:
pm2 monit
```

## Troubleshooting

**Still using too much memory?**

1. Check if PM2 is auto-restarting it: `pm2 list`
2. Check for memory leaks in API routes
3. Consider upgrading your RAM or using production mode for development

**Need real-time features while developing?**
ZMQ is now enabled by default. Add to your `.env` file:

```bash
# Enable ZMQ for real-time blockchain updates (enabled by default)
ENABLE_ZMQ=true

# Or disable to save memory in development
# ENABLE_ZMQ=false
```

Or run with environment variable:

```bash
ENABLE_ZMQ=true npm run dev   # Enable (default if set in .env)
ENABLE_ZMQ=false npm run dev  # Disable to save memory
```
