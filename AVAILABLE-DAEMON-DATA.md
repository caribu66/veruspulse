# Available Verus Daemon Data for Display

This document outlines all the real-time data available from the Verus daemon and suggestions for where to display it.

## ✅ Currently Implemented (Main Page Quick Stats)

### Quick Stats Bar (Updated)

- **Network Status** - Active/Connected/Inactive (from `getblockchaininfo` + `getnetworkinfo`)
- **Block Height** - Current blockchain height (from `getblockchaininfo`)
- **Connections** - Number of active peer connections (from `getnetworkinfo`)
- **Mempool** - Number of pending transactions (from `getmempoolinfo`)
- **Chain** - Network name (VRSC/VRSCTEST) (from `getblockchaininfo`)
- **Hash Rate** - Network mining hash rate (from `getmininginfo`)

All stats auto-refresh every 30 seconds.

---

## 🚀 Additional Real Data We Can Show

### 1. Network Health Indicators

#### Available from `getnetworkinfo`:

- **Protocol Version** - Current protocol version
- **Subversion** - Verus client version string
- **Local Services** - Services offered by this node
- **Network Time Offset** - Time offset from network
- **Relay Fee** - Minimum relay transaction fee
- **Local Addresses** - Node's network addresses
- **Warnings** - Any network warnings

**Where to show**: Network Dashboard or dedicated Network Health widget

#### Available from `getpeerinfo`:

- **Peer Details** - List of connected peers with:
  - IP addresses
  - Connection time
  - Last send/receive times
  - Bytes sent/received
  - Ping time
  - Protocol version
  - Peer services

**Where to show**: Network Dashboard > Peers section

---

### 2. Blockchain Statistics

#### Available from `getchaintxstats`:

- **Transaction Rate** - Transactions per second over N blocks
- **Window Block Count** - Number of blocks in the analysis window
- **Window Transaction Count** - Total transactions in window
- **Window Interval** - Time span of the window

**Where to show**: Dashboard > Blockchain Activity widget

#### Available from `gettxoutsetinfo`:

- **Total Amount** - Total VRSC in existence
- **UTXO Count** - Total number of unspent transaction outputs
- **Transactions** - Total number of transactions with unspent outputs
- **Disk Size** - Size of the UTXO database
- **Block Height at Snapshot** - When this data was captured

**Where to show**: Dashboard > Supply & Economics widget

---

### 3. Mining & Staking Details

#### Already available from `getmininginfo`:

- ✅ Network Hash Rate (implemented)
- **Current Block Size** - Size of block being mined
- **Current Block Transactions** - Transactions in current block
- **Pooled Transactions** - Mempool transaction count
- **Generate** - Whether mining is enabled
- **Hash Algorithms** - Mining algorithms in use

#### Available from `getstakinginfo` / `getwalletinfo`:

- **Staking Status** - Whether wallet is staking
- **Eligible Balance** - Balance eligible for staking
- **Staking Weight** - Your staking weight
- **Network Stake Weight** - Total network stake weight
- **Expected Time** - Expected time to next stake
- **Staking Outputs** - Number of UTXOs staking

**Where to show**: Dashboard > Mining & Staking section (already partially implemented)

---

### 4. Recent Blockchain Activity

#### Available from `getblock` + `getblockhash`:

- **Latest Blocks** - Last N blocks with:
  - Block hash
  - Height
  - Timestamp
  - Transaction count
  - Size
  - Miner/Staker
  - Difficulty
  - Age (time since mined)

**API exists**: `/api/latest-blocks`
**Where to show**: Dashboard > Recent Blocks table (mini version on main page)

#### Available from `getrawmempool` + `getrawtransaction`:

- **Latest Transactions** - Recent transactions with:
  - Transaction ID
  - Amount transferred
  - Fee paid
  - Size
  - Time received
  - Input/Output count

**API exists**: `/api/latest-transactions`
**Where to show**: Dashboard > Recent Transactions table (mini version on main page)

---

### 5. Verus-Specific Features

#### VerusID Data (from `listidentities` + `getidentity`):

- **Total VerusIDs** - Count of registered identities
- **Recent Identities** - Newest registered IDs
- **Identity Details** - For specific IDs:
  - Name
  - Primary addresses
  - Recovery authority
  - Private/Public keys
  - Time locked
  - Content map (IPFS, URLs, etc.)

**API exists**: `/api/verus-identities`
**Where to show**:

- Main page: Total VerusID count badge
- VerusID Explorer tab (already exists)

#### Currency/PBaaS Data (from `getcurrency`):

- **Native Currency** - Chain currency details:
  - Name
  - Total supply
  - Pre-allocation
  - Initial supply
  - Block reward
- **Token/Currency List** - All currencies on chain
- **Reserves** - Reserve currency balances

**API exists**: `/api/verus-currencies`, `/api/verus-pbaas`
**Where to show**: Dashboard > Currencies & Chains widget

---

### 6. Mempool Analytics

#### Available from `getmempoolinfo`:

- ✅ Mempool Size (implemented)
- **Total Bytes** - Memory usage
- **Usage** - Current memory usage
- **Max Mempool** - Maximum mempool size
- **Mempool Min Fee** - Minimum fee to enter mempool
- **Min Relay Fee** - Minimum relay transaction fee

#### Available from `getrawmempool(true)`:

- **Transaction Details** - For each mempool tx:
  - Size
  - Fee
  - Time in mempool
  - Height
  - Descendant count
  - Ancestor count

**Where to show**: Dashboard > Mempool Details widget

---

### 7. Value Pool Information

#### Available from `getblockchaininfo`:

- **Transparent Pool** - Value in transparent addresses
- **Sprout Pool** - Sprout shielded pool value
- **Sapling Pool** - Sapling shielded pool value
- **Pool Monitoring Status** - Which pools are being tracked

**Where to show**: Dashboard > Privacy Pools section (already partially implemented)

---

### 8. Time-Based Metrics

#### Can be calculated from existing data:

- **Average Block Time** - Average time between recent blocks
- **Blocks Per Day** - Estimated blocks per day
- **Network Age** - Time since genesis block
- **Last Block Age** - Time since last block was mined
- **Difficulty Adjustment** - Time until next difficulty adjustment

**Where to show**: Dashboard > Network Statistics widget

---

## 🎯 Recommended Implementations

### Priority 1: Main Page Enhancements

1. ✅ **Quick Stats Bar** - 6 key metrics (DONE)
2. **Recent Blocks Mini Table** - Last 5 blocks
3. **Recent Transactions Mini Table** - Last 5 transactions
4. **Latest Block Timer** - Live countdown showing time since last block
5. **VerusID Count Badge** - Total registered identities

### Priority 2: Dashboard Widgets

1. **Network Health Widget** - Peer count, version, sync status
2. **Transaction Rate Chart** - TPS over time
3. **Supply & Economics Widget** - Total supply, UTXO count
4. **Latest Activity Feed** - Combined blocks + transactions

### Priority 3: Advanced Features

1. **Peer Map** - Geographic visualization of connected peers
2. **Mempool Visualizer** - Real-time mempool changes
3. **Staking Calculator** - Estimate staking rewards
4. **Currency Browser** - List all PBaaS currencies/chains

---

## 📊 Data Refresh Rates

| Data Type    | Current Refresh | Recommended          |
| ------------ | --------------- | -------------------- |
| Quick Stats  | 30s             | ✅ Good              |
| Dashboard    | 30s             | ✅ Good              |
| Blocks       | On-demand       | 10-15s auto-refresh  |
| Transactions | On-demand       | 10-15s auto-refresh  |
| Mempool      | 30s             | 10s for detail view  |
| Network Info | 30s             | 60s (changes slowly) |

---

## 🛠️ Implementation Notes

### APIs Already Available

All the following endpoints are implemented and ready to use:

- `/api/blockchain-info` - ✅ Enhanced with networkActive
- `/api/network-info` - Network and peer data
- `/api/mining-info` - Mining/hash rate data
- `/api/mempool/size` - Mempool statistics
- `/api/latest-blocks` - Recent blocks
- `/api/latest-transactions` - Recent transactions
- `/api/real-staking-data` - Staking information
- `/api/verus-identities` - VerusID list
- `/api/verus-currencies` - Currency information
- `/api/consolidated-data` - All data in one call (for efficiency)

### Next Steps

1. Add "Recent Activity" section to main page
2. Add "Latest Block Timer" widget
3. Display VerusID count in header
4. Create mini block/transaction tables for dashboard
5. Add refresh indicators to show when data is updating

### Performance Considerations

- Use WebSockets for real-time block notifications (planned)
- Cache frequently accessed data
- Batch API calls where possible (use consolidated-data endpoint)
- Implement progressive loading for large datasets
