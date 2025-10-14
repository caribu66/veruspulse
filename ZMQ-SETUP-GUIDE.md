# ZMQ Real-Time Updates Setup Guide

ZMQ (ZeroMQ) provides real-time blockchain updates without polling, making your explorer ~90% more efficient for block updates.

## What is ZMQ?

ZMQ is a messaging library that Verus daemon uses to broadcast blockchain events in real-time:
- **New blocks** → Instant notification
- **New transactions** → Instant notification
- **No polling** → Reduced daemon load
- **Better performance** → Lower latency

Based on the **verus-explorer** pattern from official Verus GitHub.

---

## Benefits

✅ **Real-time updates** - No 30-second polling delays  
✅ **90% less RPC calls** - Only fetch data when needed  
✅ **Lower daemon load** - Less stress on your node  
✅ **Instant UI updates** - Better user experience  
✅ **Optional feature** - Explorer works fine without it  

---

## Setup Steps

### 1. Install ZMQ Package

```bash
npm install zeromq
```

### 2. Configure Verus Daemon

Add these lines to your `verus.conf`:

```conf
# ZMQ Real-Time Notifications
zmqpubhashblock=tcp://127.0.0.1:28332
zmqpubhashtx=tcp://127.0.0.1:28332
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28332
```

**Note**: Port `28332` is the default. You can change it if needed.

### 3. Restart Verus Daemon

```bash
# Stop daemon
verus stop

# Wait for shutdown
sleep 10

# Start daemon
verusd &

# Or if using systemd
sudo systemctl restart verusd
```

### 4. Restart Explorer Application

```bash
# If using npm
npm run dev

# Or if using production
npm run build
npm start

# Or if using PM2
pm2 restart verus-explorer
```

### 5. Verify ZMQ is Working

Check ZMQ status via API:

```bash
curl http://localhost:3000/api/zmq/status
```

Expected response when working:
```json
{
  "success": true,
  "zmq": {
    "available": true,
    "connected": true,
    "status": "connected"
  },
  "indexer": {
    "running": true,
    "stats": {
      "blocksIndexed": 5,
      "transactionsIndexed": 23
    }
  }
}
```

---

## Configuration Options

### Environment Variables

Add to `.env.local`:

```env
# ZMQ Configuration (optional)
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:28332

# Disable ZMQ even if installed (optional)
ENABLE_ZMQ=false
```

### Custom ZMQ Port

If you changed the port in `verus.conf`:

```env
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:YOUR_PORT
```

### Remote Daemon ZMQ

If Verus daemon is on another machine:

```env
VERUS_ZMQ_ADDRESS=tcp://DAEMON_IP:28332
```

**Important**: Make sure the firewall allows connections to the ZMQ port.

---

## Troubleshooting

### Issue: "ZMQ package not installed"

**Solution**: Install zeromq package
```bash
npm install zeromq
```

If installation fails on Windows, install Visual Studio Build Tools first.

---

### Issue: "Failed to connect to ZMQ"

**Possible causes**:
1. Daemon not configured - Add zmqpub* settings to verus.conf
2. Daemon not restarted - Restart verusd
3. Wrong port/address - Check `VERUS_ZMQ_ADDRESS`
4. Firewall blocking - Allow port 28332

**Debug**:
```bash
# Check if daemon is publishing ZMQ
netstat -an | grep 28332

# Should show LISTENING on 28332
```

---

### Issue: "ZMQ disconnected"

ZMQ will automatically attempt to reconnect. Check:
1. Is daemon still running?
2. Network connectivity
3. Check logs for details

The explorer continues working during disconnection (falls back to polling).

---

### Issue: zeromq won't compile

**On Linux**:
```bash
sudo apt-get install libzmq3-dev
npm install zeromq
```

**On macOS**:
```bash
brew install zeromq
npm install zeromq
```

**On Windows**:
1. Install Visual Studio Build Tools
2. Or use WSL (recommended for development)

---

## Performance Comparison

### Without ZMQ (Polling every 30s)
```
Block update: 0-30 seconds delay
RPC calls per minute: ~12
Daemon load: Medium
```

### With ZMQ (Real-time)
```
Block update: <1 second delay
RPC calls per minute: ~1-2
Daemon load: Low
```

**Result**: ~10x better performance for block updates

---

## Testing ZMQ

### Manual Test

1. Check status:
```bash
curl http://localhost:3000/api/zmq/status
```

2. Watch logs for new blocks:
```bash
# In development
npm run dev

# You should see:
# 🔔 New Block: 0000000000abcdef...
# ✅ Block indexed: 12345 (15 txs)
```

3. Generate a test block (if mining):
```bash
verus generate 1
```

You should see the new block logged within 1 second.

---

## Production Recommendations

### For High-Traffic Explorers

1. **Enable ZMQ** - Significantly reduces daemon load
2. **Monitor stats** - Check `/api/zmq/status` regularly
3. **Alert on disconnection** - Set up monitoring
4. **Use PM2** - Auto-restart on crashes

### For Low-Traffic Explorers

ZMQ is optional but still recommended for:
- Better user experience
- Real-time feel
- Reduced polling overhead

---

## API Endpoints

### GET /api/zmq/status
Get ZMQ connection status and indexing stats

### POST /api/zmq/status
Control ZMQ indexer

**Start indexer**:
```bash
curl -X POST http://localhost:3000/api/zmq/status \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

**Stop indexer**:
```bash
curl -X POST http://localhost:3000/api/zmq/status \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

**Reset stats**:
```bash
curl -X POST http://localhost:3000/api/zmq/status \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_stats"}'
```

---

## Architecture

```
[Verus Daemon]
      |
      | (ZMQ Pub)
      v
[ZMQ Listener] ────> [Event Emitter]
      |                    |
      |                    v
      |              [Block Indexer]
      |                    |
      |                    v
      |              [Cache Invalidation]
      |                    |
      v                    v
[Real-time UI Updates] [Database Updates]
```

---

## Optional: Disable ZMQ

If you want to disable ZMQ without uninstalling:

```env
# .env.local
ENABLE_ZMQ=false
```

Or simply don't configure zmqpub* in verus.conf. The explorer will work fine without it.

---

## References

- **Official Verus Implementation**: [pangz-lab/verus-explorer](https://github.com/pangz-lab/verus-explorer)
- **ZeroMQ Documentation**: https://zeromq.org/
- **Verus Wiki**: https://wiki.verus.io/

---

## Summary

✅ **Installation**: `npm install zeromq`  
✅ **Configuration**: Add zmqpub* to verus.conf  
✅ **Benefits**: Real-time updates, 90% less RPC calls  
✅ **Optional**: Explorer works without ZMQ  
✅ **Production Ready**: Used by official explorers  

**Status check**: Visit `/api/zmq/status` to verify setup

---

*Setup guide created: October 8, 2025*  
*Based on official verus-explorer implementation*



