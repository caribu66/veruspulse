# Stake Amount Extraction & Accurate APY Calculation

## Overview

This feature extracts **actual staked amounts** from coinstake transactions to calculate **accurate APY** for VerusIDs. Previously, APY was estimated using multipliers (e.g., `totalRewards * 20`). Now, we extract the real stake amounts from the blockchain.

## 🎯 What Changed

### Before

- **APY Formula**: `(Total Rewards / ESTIMATED_STAKE * 20 / Years) × 100`
- **Problem**: No way to know actual staked amount
- **Result**: All APY values were rough estimates

### After

- **APY Formula**: `(Total Rewards / ACTUAL_AVG_STAKE / Years) × 100`
- **Solution**: Extract stake amounts from coinstake transaction inputs
- **Result**: Accurate APY when data is available, estimated as fallback

## 🏗️ Architecture

### Database Changes

```sql
-- New columns in staking_rewards table
ALTER TABLE staking_rewards
ADD COLUMN stake_amount_sats BIGINT DEFAULT NULL;

-- New columns in verusid_statistics table
ALTER TABLE verusid_statistics
ADD COLUMN apy_calculation_method VARCHAR(20) DEFAULT 'estimated',
ADD COLUMN stakes_with_real_amounts INTEGER DEFAULT 0,
ADD COLUMN avg_stake_amount_vrsc DECIMAL(20,8) DEFAULT NULL;
```

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Scan Block for VerusID Stakes                          │
│     └─> Find coinstake transaction                         │
│         └─> Extract outputs (rewards)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Extract Stake Amount (NEW!)                            │
│     └─> Loop through coinstake inputs (vins)               │
│         └─> Fetch previous transaction for each vin        │
│             └─> Check if UTXO belongs to VerusID           │
│                 └─> Sum up staked amounts                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Store in Database                                       │
│     └─> INSERT INTO staking_rewards (                      │
│           ...,                                              │
│           stake_amount_sats = <extracted_amount>            │
│         )                                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Calculate APY                                           │
│     ├─> If stakes_with_amounts >= 30:                      │
│     │   └─> Use ACTUAL avg_stake_amount                    │
│     │       (High confidence!)                              │
│     └─> Else:                                               │
│         └─> Use ESTIMATED stake amount                      │
│             (Fallback for old data)                         │
└─────────────────────────────────────────────────────────────┘
```

## 📊 APY Confidence Levels

| Stakes with Data | Completeness | Confidence | Method    | Label                   |
| ---------------- | ------------ | ---------- | --------- | ----------------------- |
| 100+             | 80%+         | Very High  | actual    | 🎯 Very High Confidence |
| 50+              | 50%+         | High       | actual    | ✅ High Confidence      |
| 30+              | Any          | Medium     | hybrid    | 📊 Medium Confidence    |
| 10+              | Any          | Low        | hybrid    | 📈 Low Confidence       |
| <10              | Any          | Very Low   | estimated | ⚠️ Estimated            |

## 🚀 Installation & Setup

### Step 1: Apply Database Migration

```bash
cd /home/explorer/verus-dapp
psql $DATABASE_URL < scripts/add-stake-amount-tracking.sql
```

This adds:

- `stake_amount_sats` column to `staking_rewards`
- APY quality tracking columns to `verusid_statistics`
- Helper functions and views

### Step 2: Verify Migration

```bash
psql $DATABASE_URL -c "
SELECT
  COUNT(*) as total_stakes,
  COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL) as with_amounts,
  ROUND(
    COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::DECIMAL / COUNT(*) * 100,
    2
  ) as completeness_pct
FROM staking_rewards
WHERE source_address = identity_address;
"
```

Expected output (initially):

```
 total_stakes | with_amounts | completeness_pct
--------------+--------------+------------------
       50000  |            0 |             0.00
```

## 🔄 Usage

### For New Stakes (Automatic)

New stakes scanned by the priority scanner automatically extract stake amounts:

```bash
# Priority scan a VerusID (via API or script)
curl -X POST https://www.veruspulse.com/api/verusid/scan \
  -H "Content-Type: application/json" \
  -d '{"address": "iYourVerusID..."}'
```

The scanner now:

1. ✅ Extracts reward amount (as before)
2. ✅ Extracts stake amount (NEW!)
3. ✅ Stores both in database
4. ✅ Calculates APY using actual data

### For Historical Stakes (Backfill)

Backfill stake amounts for existing data:

```bash
# Basic usage
node scripts/backfill-stake-amounts.js

# Process specific address
node scripts/backfill-stake-amounts.js --address=iYourVerusID...

# Limit number of stakes
node scripts/backfill-stake-amounts.js --max-stakes=1000

# Adjust batch size and rate limiting
node scripts/backfill-stake-amounts.js --batch-size=50 --rate-limit=200

# Resume from where you left off
node scripts/backfill-stake-amounts.js --resume
```

**Performance Characteristics:**

- **Speed**: ~2-5 stakes/second (depends on RPC latency)
- **RPC Calls**: 1-5 per stake (fetching previous transactions)
- **Safe**: Can be interrupted and resumed
- **Idempotent**: Can run multiple times safely

### Check Progress

```bash
psql $DATABASE_URL -c "SELECT * FROM verusid_apy_quality LIMIT 10;"
```

This shows:

- Total stakes per VerusID
- Stakes with real amounts
- Data completeness %
- APY calculation method
- Average stake amount

## 📱 API Response Changes

### Enhanced APY Object

```json
{
  "performance": {
    "apy": {
      "allTime": 3.45,
      "yearly": 3.5,
      "90d": 3.6,
      "30d": 3.7,
      "7d": 3.8,

      // NEW FIELDS
      "calculationMethod": "actual", // or "estimated" or "hybrid"
      "stakesWithRealAmounts": 266, // Number of stakes with extracted data
      "avgStakeAmountVRSC": 45123.45, // Average staked amount in VRSC
      "dataCompleteness": 95, // Percentage of stakes with data
      "confidenceLevel": {
        "level": "very-high",
        "label": "🎯 Very High Confidence",
        "description": "APY calculated from 100+ actual stake amounts"
      }
    }
  }
}
```

### Frontend Display

```jsx
// Example: Display APY with confidence badge
<div className="apy-display">
  <span className="apy-value">{apy.allTime}%</span>
  <span className="confidence-badge">{apy.confidenceLevel.label}</span>
  <span className="data-info">
    {apy.stakesWithRealAmounts}/{totalStakes} stakes
  </span>
</div>
```

## 🔍 Example: Real vs Estimated

### Example 1: allbits@ (266 stakes)

**Before (Estimated)**:

```
Total Rewards: 1,234 VRSC over 365 days
Estimated Stake: 1,234 × 20 = 24,680 VRSC
Estimated APY: (1,234 / 24,680 / 1) × 100 = 5.0%
```

**After (Actual)** - if avg stake was 50,000 VRSC:

```
Total Rewards: 1,234 VRSC over 365 days
Actual Avg Stake: 50,000 VRSC (extracted from blockchain)
Actual APY: (1,234 / 50,000 / 1) × 100 = 2.47%
```

The difference: **5.0% → 2.47%** (more accurate!)

### Example 2: Small Staker (50 stakes)

**Before (Estimated)**:

```
Total Rewards: 50 VRSC over 180 days
Estimated Stake: 50 × 20 = 1,000 VRSC
Estimated APY: (50 / 1,000 / 0.493) × 100 = 10.14%
```

**After (Actual)** - if avg stake was 500 VRSC:

```
Total Rewards: 50 VRSC over 180 days
Actual Avg Stake: 500 VRSC (extracted)
Actual APY: (50 / 500 / 0.493) × 100 = 20.28%
```

The difference: **10.14% → 20.28%** (small stakers get accurate representation!)

## 📈 Performance Impact

### Scanning Speed

| Scenario            | Before          | After               | Change      |
| ------------------- | --------------- | ------------------- | ----------- |
| New stake scan      | ~200 blocks/sec | ~100-150 blocks/sec | -25-50%     |
| Backfill historical | N/A             | ~2-5 stakes/sec     | New feature |

**Why slower?**

- Each stake requires 1-5 additional RPC calls to fetch previous transactions
- This is necessary to get accurate stake amounts

**Mitigation:**

- Rate limiting prevents daemon overload
- Batch processing
- Can be run in background

### Storage Impact

- **Additional storage per stake**: 8 bytes (BIGINT)
- **For 100,000 stakes**: ~800 KB additional storage
- **Negligible**: Modern databases handle this easily

## 🛠️ Troubleshooting

### Issue: Backfill is slow

**Solution:**

```bash
# Reduce rate limiting (if daemon can handle it)
node scripts/backfill-stake-amounts.js --rate-limit=50

# Or increase batch size
node scripts/backfill-stake-amounts.js --batch-size=200
```

### Issue: RPC connection errors

**Solution:**

```bash
# Check RPC credentials
echo $VERUS_RPC_USER
echo $VERUS_RPC_PASSWORD

# Test RPC connection
curl --user $VERUS_RPC_USER:$VERUS_RPC_PASSWORD \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  -H 'content-type: text/plain;' \
  http://127.0.0.1:18843/
```

### Issue: Some stakes have NULL stake_amount_sats

**This is expected!**

- Extraction may fail for some stakes (complex coinstakes, RPC errors, etc.)
- The system gracefully falls back to estimation for these cases
- As long as you have 30+ stakes with data, APY will be accurate

### Issue: APY still shows "estimated"

**Possible causes:**

1. Not enough stakes with data yet (need 30+)
2. Backfill hasn't run yet
3. Statistics not recalculated

**Solution:**

```bash
# Run backfill for this VerusID
node scripts/backfill-stake-amounts.js --address=iYourAddress...

# Recalculate statistics
node scripts/recalculate-all-stats.js
```

## 📚 Code Reference

### Key Files

| File                                             | Purpose                          |
| ------------------------------------------------ | -------------------------------- |
| `lib/utils/stake-amount-extractor.js`            | Core extraction logic            |
| `lib/services/priority-verusid-scanner.ts`       | Enhanced scanner with extraction |
| `app/api/verusid/[iaddr]/staking-stats/route.ts` | API with confidence levels       |
| `scripts/add-stake-amount-tracking.sql`          | Database migration               |
| `scripts/backfill-stake-amounts.js`              | Historical data backfill         |

### Extraction Algorithm

```javascript
// Simplified version
async function extractStakeAmount(coinstakeTx, identityAddress) {
  let totalStaked = 0;

  // Loop through inputs
  for (const vin of coinstakeTx.vin) {
    // Get previous transaction
    const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
    const prevOutput = prevTx.vout[vin.vout];

    // Check if UTXO belongs to our identity
    if (prevOutput.scriptPubKey.addresses.includes(identityAddress)) {
      totalStaked += prevOutput.value;
    }
  }

  return totalStaked;
}
```

## 🎯 Best Practices

### For Production Deployment

1. **Apply migration during low-traffic period**

   ```bash
   psql $DATABASE_URL < scripts/add-stake-amount-tracking.sql
   ```

2. **Restart your application**

   ```bash
   pm2 restart verus-dapp
   ```

3. **Backfill gradually**

   ```bash
   # Process 1000 stakes at a time
   while true; do
     node scripts/backfill-stake-amounts.js --max-stakes=1000
     sleep 60  # Wait 1 minute between batches
   done
   ```

4. **Monitor progress**
   ```bash
   watch -n 60 "psql $DATABASE_URL -c 'SELECT * FROM verusid_apy_quality LIMIT 5;'"
   ```

### For Development

1. **Test with a specific address**

   ```bash
   node scripts/backfill-stake-amounts.js \
     --address=iYourTestAddress... \
     --max-stakes=10
   ```

2. **Check extraction quality**
   ```bash
   psql $DATABASE_URL -c "
   SELECT
     block_height,
     amount_sats / 100000000.0 as reward_vrsc,
     stake_amount_sats / 100000000.0 as staked_vrsc,
     ROUND((amount_sats::DECIMAL / stake_amount_sats) * 100, 4) as reward_pct
   FROM staking_rewards
   WHERE stake_amount_sats IS NOT NULL
   ORDER BY block_height DESC
   LIMIT 10;
   "
   ```

## 🚀 Future Enhancements

### Potential Improvements

1. **Cache Previous Transactions**
   - Store frequently accessed prev txs to reduce RPC calls
   - Speed up backfill by 50%+

2. **Parallel Processing**
   - Process multiple stakes simultaneously
   - Use worker threads or separate processes

3. **Stake Amount Prediction**
   - Use ML to predict stake amounts for missing data
   - Further improve APY accuracy

4. **Real-time Extraction**
   - Extract stake amounts as blocks are mined
   - No backfill needed for new data

5. **Network-wide Analytics**
   - Track average stake amounts across all VerusIDs
   - Compare individual vs network average

## 📊 Success Metrics

Track these metrics to measure success:

```bash
# Overall extraction completeness
psql $DATABASE_URL -c "
SELECT
  COUNT(*) as total_stakes,
  COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL) as extracted,
  ROUND(
    COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::DECIMAL / COUNT(*) * 100,
    2
  ) as completeness_pct
FROM staking_rewards
WHERE source_address = identity_address;
"

# VerusIDs with high-confidence APY
psql $DATABASE_URL -c "
SELECT
  COUNT(*) as verusids_with_high_confidence
FROM verusid_statistics
WHERE apy_calculation_method IN ('actual', 'hybrid')
  AND stakes_with_real_amounts >= 30;
"

# Average stake amounts
psql $DATABASE_URL -c "
SELECT
  ROUND(AVG(stake_amount_sats) / 100000000.0, 2) as avg_stake_vrsc,
  ROUND(MIN(stake_amount_sats) / 100000000.0, 2) as min_stake_vrsc,
  ROUND(MAX(stake_amount_sats) / 100000000.0, 2) as max_stake_vrsc
FROM staking_rewards
WHERE stake_amount_sats IS NOT NULL;
"
```

## 🎓 Learn More

- [Verus Staking Documentation](https://wiki.verus.io/#!faq-allos/staking-faq.md)
- [VerusPulse Architecture](./ARCHITECTURE.md)
- [Database Schema](./lib/database/utxo-schema.sql)

## 📝 License

Same as VerusPulse - see main README

---

**Questions?** Open an issue on GitHub or ask in the Verus Discord!
