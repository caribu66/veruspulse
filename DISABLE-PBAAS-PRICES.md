# Disable PBaaS Price Polling

## Overview

To reduce daemon load during the historical scan, PBaaS price polling can be temporarily disabled via environment variable.

## How to Disable

### Option 1: Environment Variable (Recommended)

The environment variable is already set in `.env`:

```bash
DISABLE_PBAAS_PRICES=true
```

### Option 2: Temporarily Disable

Edit `.env` file:

```bash
# Disable PBaaS prices
DISABLE_PBAAS_PRICES=true
```

Then restart the Next.js server:

```bash
# Stop the server (Ctrl+C)
# Or if running in PM2/systemd, restart it

# Start again
npm run dev
# or
npm run build && npm start
```

## How to Re-enable

When historical scan is complete and you want prices back:

Edit `.env`:

```bash
# Re-enable PBaaS prices
DISABLE_PBAAS_PRICES=false
# Or comment it out:
# DISABLE_PBAAS_PRICES=true
```

Then restart the server.

## What Gets Disabled

When `DISABLE_PBAAS_PRICES=true`:

- ✅ `/api/pbaas-prices` returns empty data immediately
- ✅ `/api/live-prices` returns empty data immediately
- ✅ No RPC calls to daemon for currency data
- ✅ Frontend components gracefully handle empty data
- ✅ Dashboard still works, just without price tickers

## Impact

### What Still Works

- ✅ VerusID explorer
- ✅ Staking stats
- ✅ UTXO visualizer
- ✅ All core functionality
- ✅ Historical scanning

### What's Temporarily Disabled

- ❌ PBaaS price ticker
- ❌ VRSC price display
- ❌ PBaaS chain prices
- ❌ Live price indicators

## Current Status

✅ **PBaaS prices are now DISABLED**

This setting is already active in your `.env` file:

```
DISABLE_PBAAS_PRICES=true
```

## Verification

Check if it's working:

```bash
# Should return empty data with disabled: true
curl http://localhost:3000/api/pbaas-prices | jq '.data.disabled'
# Output: true

curl http://localhost:3000/api/live-prices | jq '.data.disabled'
# Output: true
```

## When to Use

### Use During:

- ✅ Historical scan (6 days)
- ✅ Large block range scans
- ✅ High daemon load situations
- ✅ Development/testing

### Re-enable After:

- Historical scan completes
- Daemon is less busy
- You want live price data again

## Benefits

With PBaaS prices disabled:

- 🚀 Reduced daemon RPC load
- 🚀 Faster historical scanning
- 🚀 No price polling overhead
- 🚀 Focus all daemon resources on block scanning

## Notes

- Frontend components handle empty data gracefully
- No errors or crashes from disabled prices
- Can be toggled on/off anytime
- Takes effect immediately after server restart

---

**Current Status:** ✅ Disabled  
**Set in:** `.env`  
**Restart required:** Yes (after changing)  
**Next action:** Restart dev server for changes to take effect
