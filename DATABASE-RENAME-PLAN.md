# 📊 Database Rename Plan

**Current**: `verus_utxo_db`  
**New**: `POS_DB`

---

## ⚠️ Important Considerations

### Why Rename?

**Current name**: `verus_utxo_db` (confusing - suggests UTXOs, but it's mainly staking data)  
**New name**: `POS_DB` (clear - Proof of Stake database)

### Impact:

This will require updating:
- ✅ Environment variables (.env)
- ✅ All scanner scripts
- ✅ API connections
- ✅ PM2 configuration
- ✅ Cron scripts

---

## 🎯 Two Approaches:

### Option 1: RENAME DATABASE (Recommended - Keeps All Data)

**Steps:**
1. Stop all services
2. Rename database from `verus_utxo_db` to `POS_DB`
3. Update all connection strings
4. Restart services
5. Test everything

**Pros:**
- ✅ Keeps all data (263K stakes)
- ✅ No data migration needed
- ✅ Fast (just rename)

**Cons:**
- ⚠️ Requires brief downtime (2-3 minutes)

---

### Option 2: CREATE NEW + MIGRATE (Slower)

**Steps:**
1. Create new `POS_DB` database
2. Dump data from `verus_utxo_db`
3. Import into `POS_DB`
4. Update connection strings
5. Test, then drop old database

**Pros:**
- ✅ Can test before switching
- ✅ Keeps old database as backup

**Cons:**
- ❌ Takes longer
- ❌ Requires more disk space

---

## My Recommendation: Option 1 (Rename)

**Quick, clean, no data migration needed.**

Ready to proceed?

