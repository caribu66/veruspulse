# Stake Timestamp Solution

## Problem

The Recent Stakes Timeline shows duplicate timestamps ("19 hr ago", "Oct 29") because the data comes from aggregated daily statistics instead of individual stake events.

## Root Cause

The `verusid-staking-dashboard.tsx` component fetches data from `stats?.timeSeries?.daily`, which aggregates all stakes from a day into a single entry. This loses individual timing information.

```typescript
// Current code in verusid-staking-dashboard.tsx lines 1502-1523
recentStakes={
  stats?.timeSeries?.daily
    ? stats.timeSeries.daily
        .filter((day: any) => day.stakeCount > 0)
        .flatMap((day: any) => {
          // Creates multiple entries with same timestamp
          return Array(day.stakeCount).fill({
            blockHeight: null, // No block height available
            blockTime: day.date, // Same date for all stakes in that day
            amountVRSC: day.totalRewardsVRSC / day.stakeCount,
          });
        })
    : []
}
```

## Solution

### Database Already Has Individual Timestamps

The database schema in `stake_events` and `staking_rewards` tables already stores individual block timestamps:

```sql
-- From lib/database/utxo-schema.sql line 37-53
CREATE TABLE IF NOT EXISTS stake_events (
  id SERIAL PRIMARY KEY,
  utxo_id INTEGER REFERENCES utxos(id),
  address VARCHAR(255) NOT NULL,
  txid VARCHAR(64) NOT NULL,
  block_height INTEGER NOT NULL,
  block_time TIMESTAMP NOT NULL,  -- ✅ Individual timestamps exist!
  reward_amount BIGINT NOT NULL,
  stake_amount BIGINT NOT NULL,
  ...
);
```

### API Endpoint Already Exists

There's already an API endpoint that returns individual stake events with timestamps:

**`/app/api/address/[address]/utxo-history/route.ts`**

This endpoint:

- ✅ Queries individual stake events from `stake_events` table
- ✅ Returns `block_time` for each stake
- ✅ Includes `block_height`, `txid`, `reward_amount`, etc.
- ✅ Already used in other parts of the application

## Implementation Plan

### Step 1: Update the Dashboard Component

Change `verusid-staking-dashboard.tsx` to fetch individual stake events instead of aggregated data:

```typescript
// Replace lines 1502-1523 with:
const [recentStakes, setRecentStakes] = useState<any[]>([]);

// Fetch individual stake events
useEffect(() => {
  const fetchRecentStakes = async () => {
    try {
      const response = await fetch(`/api/address/${iaddr}/utxo-history`);
      const data = await response.json();

      if (data.success) {
        // Map to the format expected by RecentStakesTimeline
        const stakes = data.data.timeline.map((event: any) => ({
          blockHeight: event.blockHeight,
          blockTime: event.blockTime,
          amountVRSC: event.rewardAmount / 100000000, // Convert satoshis to VRSC
          txid: event.txid,
        }));

        // Sort by block time descending and limit to 50
        setRecentStakes(
          stakes
            .sort(
              (a: any, b: any) =>
                new Date(b.blockTime).getTime() -
                new Date(a.blockTime).getTime()
            )
            .slice(0, 50)
        );
      }
    } catch (error) {
      console.error('Failed to fetch recent stakes:', error);
      // Fallback to aggregated data if individual events fail
      setRecentStakes(/* existing aggregated data */);
    }
  };

  if (iaddr) {
    fetchRecentStakes();
  }
}, [iaddr]);
```

### Step 2: Remove the Randomization Hack

Remove the time randomization added in `recent-stakes-timeline.tsx` (lines 57-81) since we'll now have real timestamps.

### Step 3: Update RecentStakesTimeline Component

The component is already set up to handle individual block heights (lines 216-220 and 227-236), just needs real data.

## Benefits

1. ✅ **Accurate Timestamps** - Shows actual time each stake occurred
2. ✅ **Block Heights** - Shows actual block numbers where stakes happened
3. ✅ **Transaction IDs** - Can link to full transaction details
4. ✅ **No Duplicates** - Each stake has unique timing information
5. ✅ **Uses Existing Infrastructure** - Leverages existing API and database schema

## Testing Plan

1. Test with VerusIDs that have multiple stakes in same day
2. Verify timestamps are accurate and not duplicated
3. Check that block heights display correctly
4. Ensure fallback to aggregated data works if API fails

## Files to Modify

- `components/verusid-staking-dashboard.tsx` - Add state and useEffect to fetch individual stakes
- `components/recent-stakes-timeline.tsx` - Remove randomization hack (lines 57-81)

## No Database Changes Required

The database already has all the necessary fields. This is purely a frontend change to use the existing data correctly.

---

**Status:** Ready for implementation  
**Priority:** High  
**Estimated Effort:** 1-2 hours
