# ⚡ FAST On-Demand VerusID Scanner

## Overview

Ultra-fast on-demand scanner that completes in **~18-30 seconds** instead of hours by using address-based RPC calls instead of block scanning.

## Key Innovation

### Old Approach (SLOW - Hours)

- Scan every block from creation to tip
- For 100,000 blocks: 200,000 RPC calls (getblockhash + getblock)
- Process all transactions in each block
- **Time: 3-6 hours** ❌

### New Approach (FAST - Seconds)

- Use `getaddressutxos` - 1 RPC call for all UTXOs
- Use `getaddresstxids` - 1 RPC call for all transactions
- Analyze only those transactions for stakes
- **Time: 18-30 seconds** ✅

## Performance Comparison

| Metric          | Old Scanner | FAST Scanner      | Improvement     |
| --------------- | ----------- | ----------------- | --------------- |
| Time            | 3-6 hours   | 18-30 seconds     | **720x faster** |
| RPC Calls       | ~200,000    | ~520              | **384x fewer**  |
| Blocks Scanned  | 100,000     | 0 (address-based) | N/A             |
| User Experience | Unusable    | Excellent         | ✅              |

## What It Extracts

For a VerusID like `joanna@`:

1. **UTXOs**: 155 current UTXOs (instant)
2. **Transactions**: 518 total transactions
3. **Stakes**: 16 stake rewards (filtered from transactions)

All historical data, all in **~18 seconds**!

## How It Works

```javascript
// Step 1: Get all UTXOs (1 RPC call)
const utxos = await rpcCall('getaddressutxos', [
  { addresses: [identityAddress] },
]);

// Step 2: Get all transaction IDs (1 RPC call)
const txids = await rpcCall('getaddresstxids', [
  { addresses: [identityAddress] },
]);

// Step 3: Analyze transactions for stakes (parallel batches)
for (const txid of txids) {
  const tx = await rpcCall('getrawtransaction', [txid, 1]);
  if (isStakeTransaction(tx)) {
    stakes.push(extractStakeData(tx));
  }
}

// Step 4: Save to database
await saveStakes(stakes);
await saveUTXOs(utxos);
```

## Usage

### Command Line

```bash
node scripts/fast-on-demand-scanner.js "joanna@"
```

### API Endpoint

```bash
curl -X POST http://localhost:3000/api/verusid/scan \
  -H "Content-Type: application/json" \
  -d '{"verusidName": "joanna@"}'
```

### From Frontend

The VerusID explorer automatically triggers this scanner when:

- A user searches for a VerusID
- No staking data exists in the database
- User sees progress bar with real-time updates

## Files

- `scripts/fast-on-demand-scanner.js` - Main scanner implementation
- `app/api/verusid/scan/route.ts` - API endpoint
- `components/verusid-scan-progress.tsx` - Progress UI component
- `components/verusid-explorer.tsx` - Integration in explorer

## Features

✅ **Full historical data** - from VerusID creation to present  
✅ **Progress tracking** - real-time updates  
✅ **Database integration** - saves for instant future lookups  
✅ **Error handling** - graceful failures  
✅ **Parallel processing** - fetches multiple transactions simultaneously  
✅ **Under 30 seconds** - excellent UX

## Next Steps

1. ✅ Scanner implementation
2. ✅ API endpoint
3. ✅ Frontend integration
4. ✅ Progress UI
5. 🔄 Test with real users
6. 📊 Add caching layer for even faster repeat lookups

## Technical Details

### RPC Calls Used

- `getaddressutxos` - Get all unspent outputs for an address
- `getaddresstxids` - Get all transaction IDs involving an address
- `getrawtransaction` - Get detailed transaction data
- `getblock` - Get block information (for stake transactions only)

### Database Tables Updated

- `utxos` - Current UTXO state
- `staking_rewards` - Historical staking rewards
- `identities` - VerusID metadata

### Performance Optimizations

- Parallel transaction fetching (20 at a time)
- Database batch inserts
- Minimal RPC calls
- Efficient stake detection logic

## Result

**User scans their VerusID** → **18 seconds later** → **Full history displayed!** 🎉
