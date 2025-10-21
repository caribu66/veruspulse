# VerusID Lookup Flow - What Happens When User Searches

## 🔍 Scenario: User Looks Up Unknown VerusID

When a user searches for a VerusID that's **not in your database** (e.g., `joanna@` or `iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG`), here's exactly what happens:

---

## 📋 Step-by-Step Flow

### 1. **User Searches** 🔎

```
User enters: "joanna@" or "iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG"
```

### 2. **Cache Check** ⚡ (Fast)

```typescript
// Check if VerusID is already cached (sub-millisecond)
cachedIdentity = await getCachedIdentity(identity);
```

- **If cached:** Use cached data (instant response)
- **If not cached:** Continue to step 3

### 3. **Blockchain Lookup** 🔗 (Real-time)

```typescript
// Fetch from Verus blockchain via RPC
const identity = await verusAPI.getIdentity('joanna@');
```

**What gets fetched:**

- ✅ Identity address (i-address)
- ✅ Name (`joanna`)
- ✅ Primary addresses (R-addresses)
- ✅ Friendly name (`joanna@`)
- ✅ Parent identity
- ✅ Flags, version, status
- ✅ Block height, txid

**Result:**

```json
{
  "identity": {
    "identityaddress": "iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG",
    "name": "joanna",
    "friendlyname": "joanna@",
    "primaryaddresses": ["RCBwVJ..."]
  }
}
```

### 4. **Store in Database** 💾

```typescript
// Save to search history
await searchDb.storeSearch({
  searchQuery: identity,
  searchType: 'verusid',
  resultFound: true,
});

// Save VerusID details
await searchDb.storeVerusIDSearch({
  verusID: 'joanna@',
  identityAddress: 'iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG',
  primaryAddresses: ['RCBwVJ...'],
  // ... all other details
});
```

### 5. **Check If Staking Data Needed** 🎯 (CRITICAL!)

```typescript
// Check if this VerusID has staking data
const needsScan = await needsPriorityScan(identityAddress);

if (needsScan) {
  // 🚀 Trigger background priority scan!
  fetch('/api/verusid/priority-scan', {
    method: 'POST',
    body: JSON.stringify({ identityAddress }),
  });
}
```

**Priority Scan Decision:**

- ✅ **Triggers if:** VerusID has NO staking records in database
- ✅ **Triggers if:** Last scan was > 24 hours ago
- ❌ **Skips if:** VerusID already has complete data

### 6. **Return to User** 📤 (Immediate)

```json
{
  "success": true,
  "data": {
    "identity": {
      "identityAddress": "iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG",
      "name": "joanna",
      "friendlyName": "joanna@",
      "primaryAddresses": ["RCBwVJ..."]
    },
    "stats": {
      "totalRewards": 0,
      "rewardCount": 0,
      "message": "Staking data is being indexed..."
    }
  }
}
```

**User sees:**

- ✅ VerusID found!
- ✅ Basic identity information
- ⚠️ Staking stats: "No data yet - indexing in progress..."

### 7. **Background Priority Scan** 🔄 (Async)

While the user is viewing the page, **in the background**:

```typescript
// Priority scan scans ONLY this VerusID's stakes
async function priorityScanVerusID(identityAddress) {
  1. Get current block height
  2. Scan blocks for this specific I-address
  3. Find ALL stakes for this VerusID
  4. Store in staking_rewards table
  5. Update verusid_statistics table
  6. Calculate achievements
  7. Mark as "scanned"
}
```

**Time taken:** 30 seconds - 5 minutes (depending on history)

### 8. **User Refreshes** 🔄

When user refreshes the page (or clicks refresh):

```json
{
  "success": true,
  "data": {
    "identity": { ... },
    "stats": {
      "totalRewards": 1234.56,
      "rewardCount": 89,
      "firstStake": "2022-01-15",
      "latestStake": "2024-10-18",
      "averageReward": 13.87,
      "stakingStreak": 45,
      "achievements": [...]
    }
  }
}
```

**User now sees:**

- ✅ Complete staking history
- ✅ Total rewards
- ✅ Leaderboard ranking
- ✅ Achievements unlocked
- ✅ Performance metrics

---

## 🎯 User Experience Timeline

### Immediate (0-1 second)

```
✅ VerusID found: joanna@
✅ Identity details shown
⚠️ Staking stats: "Indexing in progress..."
```

### After 30 seconds - 5 minutes

```
✅ Background scan complete
✅ Staking data now available
💡 "Refresh to see your staking stats!"
```

### On Refresh

```
✅ Complete staking history
✅ 89 stakes found
✅ Total: 1,234.56 VRSC
✅ Rank #45 on leaderboard
✅ 3 achievements unlocked!
```

---

## 📊 What Gets Stored in Database

### 1. identities Table

```sql
INSERT INTO identities (
  identity_address,
  base_name,
  friendly_name,
  primary_addresses,
  ...
) VALUES (
  'iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG',
  'joanna',
  'joanna@',
  '["RCBwVJ..."]',
  ...
);
```

### 2. search_history Table

```sql
INSERT INTO search_history (
  search_query,
  search_type,
  result_found,
  timestamp
) VALUES (
  'joanna@',
  'verusid',
  true,
  NOW()
);
```

### 3. verusid_searches Table

```sql
INSERT INTO verusid_searches (
  verus_id,
  identity_address,
  friendly_name,
  primary_addresses,
  ...
) VALUES (
  'joanna@',
  'iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG',
  'joanna@',
  '["RCBwVJ..."]',
  ...
);
```

### 4. staking_rewards Table (After Priority Scan)

```sql
-- Multiple rows, one per stake
INSERT INTO staking_rewards (
  identity_address,
  txid,
  vout,
  block_height,
  block_time,
  amount_sats,
  ...
) VALUES
  ('iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG', 'abc...', 0, 2100000, ..., 600000000),
  ('iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG', 'def...', 0, 2100050, ..., 600000000),
  ... (89 rows total for joanna)
```

### 5. verusid_statistics Table (After Priority Scan)

```sql
INSERT INTO verusid_statistics (
  address,
  friendly_name,
  total_rewards,
  stake_count,
  first_stake,
  latest_stake,
  average_reward,
  ...
) VALUES (
  'iJ3fzzUKHSMA2xj7W9r6b9HGdXf4PCFESG',
  'joanna@',
  123456000000, -- sats
  89,
  '2022-01-15',
  '2024-10-18',
  1387640000,
  ...
);
```

---

## 💡 Smart Features

### 1. **Intelligent Caching**

- First lookup: Fetch from blockchain (slow)
- Second lookup: Serve from cache (instant)
- Cache TTL: 5 minutes for basic info, 1 hour for stats

### 2. **Priority Scanning**

```typescript
// Only scans VerusIDs that are actually being looked up
// Doesn't waste resources scanning everyone

if (user_looked_up_this_verusid && no_staking_data) {
  → Trigger priority scan
} else {
  → Skip (already have data)
}
```

### 3. **Graceful Degradation**

```typescript
// If staking data not ready yet:
return {
  identity: { ... },  // ✅ Still show identity
  stats: {
    totalRewards: 0,
    message: "Staking data is being indexed..."
  }
}
// User can still see SOMETHING, not just an error
```

### 4. **Progress Indication**

```typescript
// Frontend can show:
'⏳ Indexing your staking history... This may take 1-5 minutes';
'🔄 Refresh this page in a moment to see your stats';
```

---

## 🚀 Optimization Strategies

### For Popular VerusIDs

If a VerusID is searched multiple times:

1. First user triggers priority scan
2. Subsequent users get instant results (already indexed)

### For Rare VerusIDs

- Only scanned when actually looked up
- Prevents wasting resources on unused IDs

### For Active Stakers

- Background updates keep data fresh
- No re-scan needed on subsequent lookups

---

## ⚠️ Edge Cases Handled

### 1. **VerusID Doesn't Exist**

```json
{
  "success": false,
  "error": "Identity not found"
}
```

### 2. **VerusID Has No Stakes**

```json
{
  "success": true,
  "stats": {
    "totalRewards": 0,
    "rewardCount": 0,
    "message": "No staking activity found"
  }
}
```

### 3. **Priority Scan Fails**

```typescript
// Still returns basic identity info
// User can manually trigger rescan later
```

### 4. **Database Offline**

```typescript
// Degrades to blockchain-only lookups
// No historical stats, but basic info still works
```

---

## 📈 Performance Metrics

### Cold Lookup (Unknown VerusID)

```
1. Cache check:      < 1ms
2. Blockchain RPC:   50-200ms
3. Store in DB:      10-50ms
4. Priority scan:    Background (30s-5min)
────────────────────────────────
Total response:      60-250ms  ✅ Fast!
```

### Warm Lookup (Known VerusID, No Stats Yet)

```
1. Cache check:      < 1ms
2. Blockchain RPC:   SKIPPED (cached)
3. Return cached:    < 5ms
────────────────────────────────
Total response:      < 10ms  ✅ Instant!
```

### Hot Lookup (Complete Data)

```
1. Cache check:      < 1ms
2. Stats from DB:    < 10ms
────────────────────────────────
Total response:      < 15ms  ✅ Lightning!
```

---

## 🎯 Summary

### What User Sees (First Time)

1. ✅ Instant: "VerusID found!"
2. ✅ Instant: Identity details displayed
3. ⏳ Waiting: "Staking stats loading..."
4. 🔄 After scan: "Refresh to see stats!"

### What System Does (Behind Scenes)

1. ✅ Fetch from blockchain
2. ✅ Store in database
3. ✅ Cache for future lookups
4. 🚀 Trigger priority scan (background)
5. 💾 Index all stakes
6. 📊 Calculate statistics
7. 🏆 Evaluate achievements

### Result

- ✅ Fast initial response (< 250ms)
- ✅ Complete data within 1-5 minutes
- ✅ Instant lookups thereafter
- ✅ Always fresh data
- ✅ Scales efficiently

---

**Key Insight:** Your system is **smart** - it only indexes what users actually care about, but does it **automatically in the background** so the user experience is seamless!

🎉 **Users get their data without waiting, and you don't waste resources scanning IDs nobody looks at!**
