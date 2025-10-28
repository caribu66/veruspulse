# Quick Start: Stake Amount Extraction

## 🚀 Get Accurate APY in 3 Steps

### Step 1: Apply Database Migration (2 minutes)

```bash
cd /home/explorer/verus-dapp
psql $DATABASE_URL < scripts/add-stake-amount-tracking.sql
```

**Expected output:**

```
ALTER TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
...
```

### Step 2: Restart Application (1 minute)

```bash
pm2 restart verus-dapp
# OR
npm run dev  # if in development
```

### Step 3: Start Backfilling (ongoing)

```bash
# Test with one VerusID first
node scripts/backfill-stake-amounts.js \
  --address=iYourFavoriteVerusID... \
  --max-stakes=100

# Then run for all (can take hours/days for large datasets)
nohup node scripts/backfill-stake-amounts.js &
```

**Monitor progress:**

```bash
tail -f nohup.out
```

---

## ✅ Verification

### Check if it's working:

```bash
# See some extracted stake amounts
psql $DATABASE_URL -c "
SELECT
  block_height,
  amount_sats / 100000000.0 as reward_vrsc,
  stake_amount_sats / 100000000.0 as staked_vrsc
FROM staking_rewards
WHERE stake_amount_sats IS NOT NULL
ORDER BY block_height DESC
LIMIT 5;
"
```

**Expected output:**

```
 block_height | reward_vrsc | staked_vrsc
--------------+-------------+-------------
      2745123 |        4.50 |    50000.00
      2745089 |        3.20 |    35000.00
      2745034 |        5.10 |    60000.00
...
```

### Check APY quality:

```bash
psql $DATABASE_URL -c "
SELECT * FROM verusid_apy_quality
WHERE stakes_with_real_amounts > 0
LIMIT 5;
"
```

**Look for:**

- `data_completeness_pct` increasing over time
- `apy_calculation_method` changing from "estimated" to "actual"

---

## 🎯 What Happens Next?

### Automatically (for new stakes):

✅ Every new stake scanned will have its stake amount extracted  
✅ APY calculations will use actual data  
✅ Confidence levels will improve over time

### Manual (for historical data):

⏳ Run backfill script periodically  
⏳ Old stakes gradually get accurate data  
⏳ APY becomes more accurate as data completeness increases

---

## 📱 See It in Action

### In the API:

```bash
curl https://www.veruspulse.com/api/verusid/iYourAddress.../staking-stats | jq '.data.performance.apy'
```

**New fields you'll see:**

```json
{
  "allTime": 3.45,
  "calculationMethod": "actual",
  "stakesWithRealAmounts": 150,
  "avgStakeAmountVRSC": 45123.45,
  "dataCompleteness": 85,
  "confidenceLevel": {
    "level": "high",
    "label": "✅ High Confidence",
    "description": "APY calculated from 50+ actual stake amounts"
  }
}
```

### In the UI:

Look for confidence badges next to APY:

- 🎯 Very High Confidence (100+ stakes)
- ✅ High Confidence (50+ stakes)
- 📊 Medium Confidence (30+ stakes)
- ⚠️ Estimated (< 30 stakes)

---

## 🔧 Common Commands

```bash
# Process specific VerusID
node scripts/backfill-stake-amounts.js --address=iAddress...

# Process 1000 stakes and stop
node scripts/backfill-stake-amounts.js --max-stakes=1000

# Slower but safer (less load on daemon)
node scripts/backfill-stake-amounts.js --rate-limit=200 --batch-size=50

# Check progress
psql $DATABASE_URL -c "
SELECT
  COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL) as extracted,
  COUNT(*) as total,
  ROUND(
    COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::DECIMAL / COUNT(*) * 100,
    1
  ) as pct
FROM staking_rewards;
"
```

---

## 🆘 Troubleshooting

### "Database connection failed"

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "RPC call failed"

```bash
# Check RPC credentials
env | grep VERUS_RPC

# Test RPC
curl --user $VERUS_RPC_USER:$VERUS_RPC_PASSWORD \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  http://127.0.0.1:18843/
```

### Backfill is too slow

```bash
# Reduce rate limiting (be careful!)
node scripts/backfill-stake-amounts.js --rate-limit=50
```

### Need more help?

See the full documentation: [STAKE-AMOUNT-EXTRACTION.md](./STAKE-AMOUNT-EXTRACTION.md)

---

## 📊 Expected Timeline

| Data Size        | Estimated Backfill Time |
| ---------------- | ----------------------- |
| 1,000 stakes     | ~5-10 minutes           |
| 10,000 stakes    | ~1-2 hours              |
| 100,000 stakes   | ~10-20 hours            |
| 1,000,000 stakes | ~4-8 days               |

**Tip:** Run backfill in the background and let it complete over time. The system works with partial data!

---

**That's it!** Your VerusPulse now calculates accurate APY using real blockchain data. 🎉
