# 🚀 Run PoS Indexer - Final Instructions

## ✅ Pre-flight Checklist

- [x] Database cleaned (removed legacy tables)
- [x] All old scanning scripts stopped
- [x] Detection logic verified (4/4 test stakes found)
- [x] Scripts ready in `/home/explorer/verus-dapp/scripts/`

## 📋 THE COMMAND

Run this **ONCE** on your server to build the complete PoS block index:

```bash
cd /home/explorer/verus-dapp && nohup node scripts/build-pos-block-index.js > pos-index.log 2>&1 &
```

## 📊 What It Does

1. **Scans**: All blocks from 800,200 to current tip (~2.8M blocks)
2. **Identifies**: All PoS blocks (~1.4M blocks, ~50% of total)
3. **Extracts**: Staker address from each PoS block (`tx[0].vout[0]`)
4. **Stores**: In `pos_blocks` table for fast lookups
5. **Checkpoints**: Saves progress every 5,000 blocks (can resume)

## ⏱️ Timeline

- **Duration**: 4-6 hours (overnight)
- **Progress**: Updates every 500 blocks
- **Rate**: ~180-200 blocks/second
- **Completion**: Will show "PoS BLOCK INDEX BUILD COMPLETE"

## 📡 Monitoring

### Check if running:

```bash
ps aux | grep build-pos-block-index
```

### Watch live progress:

```bash
tail -f /home/explorer/verus-dapp/pos-index.log
```

### Detailed stats:

```bash
node /home/explorer/verus-dapp/scripts/monitor-pos-index.js
```

## 🎯 After Completion

Once the index is built, scan ANY VerusID in 5-10 minutes:

```bash
# Scan Caribu66@
node scripts/indexed-verusid-scanner.js "caribu66@"

# Scan Joanna@
node scripts/indexed-verusid-scanner.js "joanna@"

# Scan any other VerusID
node scripts/indexed-verusid-scanner.js "verusid@"
```

## 📊 Expected Results

### PoS Index:

- **Total PoS blocks**: ~1,400,000
- **Unique stakers**: 200-500 (will discover the real number)
- **VerusID stakers**: ~200-300 i-addresses
- **Database size**: ~500 MB

### Caribu66@ (after scanning with index):

- **Stakes**: ~1,143 (matching wallet CSV)
- **UTXOs**: ~397
- **Scan time**: 5-10 minutes

## 🛑 Stop/Control

### Stop the indexer:

```bash
pkill -f build-pos-block-index
```

### Resume (auto-resumes from last checkpoint):

```bash
nohup node scripts/build-pos-block-index.js > pos-index.log 2>&1 &
```

## 💡 Why This Approach?

**Problem**: 32,990 VerusIDs × 3 hours each = **years** of scanning

**Solution**: Build index once (6 hours), then scan any VerusID in minutes

**Benefit**:

- ✅ ONE-TIME 6-hour investment
- ✅ LIFETIME benefit for all VerusIDs
- ✅ Automatically filters inactive stakers
- ✅ Fast on-demand scanning forever

## 🎉 Final Command (Copy This)

```bash
cd /home/explorer/verus-dapp && nohup node scripts/build-pos-block-index.js > pos-index.log 2>&1 &
```

That's it! Run it and check back in 4-6 hours! 🚀
