# Verus Explorer Data Flow

## Current Implementation (Main Page)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERUS DAEMON                                  │
│                     (verusd - Port 18843)                            │
└────────────────┬─────────────┬─────────────┬─────────────────────────┘
                 │             │             │
                 │             │             │
        ┌────────▼──────┐ ┌───▼────────┐ ┌──▼────────────┐
        │ getblockchain │ │ getnetwork │ │ getmininginfo │
        │     info()    │ │   info()   │ │      ()       │
        └────────┬──────┘ └───┬────────┘ └──┬────────────┘
                 │             │             │
                 │             │             │
        ┌────────▼─────────────▼─────────────▼────────────┐
        │      /api/blockchain-info (Enhanced)            │
        │      /api/mempool/size                          │
        │      /api/mining-info                           │
        └────────┬────────────────────────────────────────┘
                 │
                 │ Parallel Fetch (Promise.all)
                 │
        ┌────────▼────────────────────────────────────────┐
        │     components/verus-explorer.tsx               │
        │                                                  │
        │  useEffect(() => {                              │
        │    fetchRealStats()  // Initial                 │
        │    setInterval(fetchRealStats, 30000)  // Auto  │
        │  })                                             │
        └────────┬────────────────────────────────────────┘
                 │
                 │ Updates State Every 30s
                 │
        ┌────────▼────────────────────────────────────────┐
        │           Quick Stats Display                    │
        │  ┌──────────┬──────────┬──────────┬──────────┐ │
        │  │ Network  │  Block   │  Conn.   │ Mempool  │ │
        │  │  Status  │  Height  │          │          │ │
        │  ├──────────┼──────────┼──────────┼──────────┤ │
        │  │  Chain   │   Hash   │          │          │ │
        │  │          │   Rate   │          │          │ │
        │  └──────────┴──────────┴──────────┴──────────┘ │
        └──────────────────────────────────────────────────┘
```

## RPC Method → UI Mapping

### 1. getblockchaininfo

```json
{
  "blocks": 1234567,              → Block Height display
  "chain": "VRSCTEST",            → Chain name
  "difficulty": 12345.67,         → Dashboard difficulty
  "verificationprogress": 0.9999, → Sync Progress
  "size_on_disk": 1234567890,     → Chain Size
  "connections": 8,               → Connections count
  "valuepools": [...]             → Privacy Pools widget
}
```

### 2. getnetworkinfo

```json
{
  "connections": 8,               → Connections count
  "networkactive": true,          → Network Status color
  "version": 1020000,             → Version info
  "subversion": "/Verus:1.2.0/",  → Client version
  "relayfee": 0.00001             → Fee information
}
```

### 3. getmininginfo

```json
{
  "networkhashps": 150000000,     → Hash Rate display
  "difficulty": 12345.67,         → Difficulty widget
  "generate": false,              → Mining status
  "staking": true                 → Staking indicator
}
```

### 4. getmempoolinfo

```json
{
  "size": 5,                      → Mempool tx count
  "bytes": 2500,                  → Mempool size in bytes
  "usage": 123456,                → Memory usage
  "maxmempool": 300000000         → Max mempool size
}
```

## Available Data Not Yet Displayed

### High Value, Easy to Add

#### Latest Block Info

```
Daemon → getblockhash(height) → getblock(hash)
  ↓
{
  "time": 1696435200,            → Calculate "X seconds ago"
  "tx": [...],                   → Transaction count
  "size": 1234                   → Block size
}
  ↓
Display: "⏱️ Last Block: 45 seconds ago"
```

#### VerusID Count

```
Daemon → listidentities()
  ↓
{
  identities: [...]              → Array of identity objects
}
  ↓
Display: "🆔 VerusIDs: 1,234 registered"
```

#### Transaction Rate

```
Daemon → getchaintxstats(nblocks)
  ↓
{
  "txcount": 12345,              → Total transactions
  "window_tx_count": 1234,       → Recent window txs
  "window_interval": 86400,      → Time period
  "txrate": 0.0143               → TPS
}
  ↓
Display: "📊 TX Rate: 0.014 tx/s"
```

### Medium Value Features

#### Peer Quality Metrics

```
Daemon → getpeerinfo()
  ↓
[
  {
    "addr": "1.2.3.4:9168",
    "pingtime": 0.123,           → Average ping
    "conntime": 123456,          → Connection duration
    "bytessent": 12345,          → Data sent
    "bytesrecv": 67890,          → Data received
    "version": 1020000           → Protocol version
  },
  ...
]
  ↓
Display: "🌐 Peer Quality: Good (avg ping: 123ms)"
```

#### Supply Information

```
Daemon → gettxoutsetinfo()
  ↓
{
  "total_amount": 1234567.89,    → Total VRSC supply
  "transactions": 12345,         → Total UTXOs
  "txouts": 67890,              → UTXO count
  "disk_size": 123456789        → Database size
}
  ↓
Display: "💰 Circulating: 1,234,567.89 VRSC"
```

## Data Refresh Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Mount                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──> Fetch immediate (t=0)
                      │     └─> Show data
                      │
                      ├──> Schedule refresh (t=30s)
                      │     └─> Background fetch
                      │          └─> Update state
                      │               └─> UI updates
                      │
                      ├──> Schedule refresh (t=60s)
                      │     └─> Background fetch
                      │          └─> Update state
                      │               └─> UI updates
                      │
                      └──> Continue every 30s until unmount
                            └─> Cleanup interval on unmount
```

## Performance Characteristics

### Current Implementation

| Metric               | Value      | Notes                       |
| -------------------- | ---------- | --------------------------- |
| API Endpoints Called | 3          | Parallel requests           |
| Total Request Time   | ~300-500ms | Network dependent           |
| Data Freshness       | 30s        | Auto-refresh interval       |
| UI Blocking          | None       | Async updates               |
| Error Handling       | Graceful   | Falls back to previous data |

### Network Traffic

```
Per Refresh Cycle (30s):
┌─────────────────────────┬──────────┬───────────────┐
│ Endpoint                │ Size     │ Time          │
├─────────────────────────┼──────────┼───────────────┤
│ /api/blockchain-info    │ ~2-3 KB  │ ~100-150ms   │
│ /api/mempool/size       │ ~0.5 KB  │ ~50-80ms     │
│ /api/mining-info        │ ~1-2 KB  │ ~80-120ms    │
├─────────────────────────┼──────────┼───────────────┤
│ Total per cycle         │ ~4-6 KB  │ ~300-500ms   │
│ Per minute (2 cycles)   │ ~8-12 KB │              │
│ Per hour (120 cycles)   │ ~0.5 MB  │              │
└─────────────────────────┴──────────┴───────────────┘
```

Very efficient! Minimal bandwidth usage.

## Future Enhancements

### WebSocket Integration (Planned)

```
┌──────────────────────────────────────────────────────────────┐
│                      VERUS DAEMON                             │
│                  ZMQ/WebSocket Server                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Push notifications
                       │ (No polling needed)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│            WebSocket Connection (lib/utils/websocket.ts)     │
│                                                               │
│  - hashblock event → New block notification                  │
│  - hashtx event    → New transaction notification            │
│  - rawblock event  → Full block data                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Real-time events
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              components/verus-explorer.tsx                    │
│                                                               │
│  useEffect(() => {                                           │
│    ws.on('newblock', (block) => {                           │
│      updateBlockHeight(block.height)                         │
│      updateLastBlockTime(block.time)                         │
│    })                                                        │
│  })                                                          │
└───────────────────────────────────────────────────────────────┘
```

Benefits:

- Instant updates (no 30s delay)
- Lower bandwidth (no polling)
- Better UX (real-time feel)
- More efficient server usage

## Summary

✅ **Currently Implemented:**

- 6 real-time metrics from daemon
- 3 parallel API calls
- 30s auto-refresh
- Graceful error handling
- Responsive design

🚀 **Easy to Add Next:**

1. Latest block timer (5 min)
2. VerusID count (15 min)
3. Sync progress bar (10 min)
4. Recent blocks table (30 min)

📊 **Available But Not Shown:**

- Peer details
- Transaction rate
- Supply information
- Value pools details
- Network quality metrics
- PBaaS chain data

See `AVAILABLE-DAEMON-DATA.md` for complete reference.
