# Staking Momentum isActive Fix - Instructions

## Problem Summary

The `isActive` field in the staking momentum API is incorrectly returning `false` when it should be `true` for users with stakes in the last 7 days.

**Example**: joanna@ (iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5) has `last7d: 1` but `isActive: false`

## Root Cause

Multiple Next.js server instances (both production `next start` and development `next dev`) were running simultaneously, causing the old production build to serve cached/outdated responses.

## The Fix (Already Applied)

### File Modified:

`app/api/verusid/[iaddr]/staking-momentum/route.ts`

### Changes Made:

Lines 145-151 now calculate `isActive` based on stakes in the last 7 days:

```typescript
// Activity status - use last7d count to determine if active
lastStakeDays: momentumAnalysis.lastStakeDays,
isActive: (() => {
  console.log('[MOMENTUM FIX] last7d:', momentumAnalysis.periods.last7d, 'type:', typeof momentumAnalysis.periods.last7d);
  console.log('[MOMENTUM FIX] Comparison result:', momentumAnalysis.periods.last7d > 0);
  return momentumAnalysis.periods.last7d > 0;
})()
```

**Logic**: If `momentumAnalysis.periods.last7d > 0`, then `isActive = true`

## How to Apply the Fix

### Step 1: Kill All Next.js Processes

```bash
pkill -9 -f "next"
```

### Step 2: Clear Build Cache

```bash
cd /home/explorer/verus-dapp
rm -rf .next
```

### Step 3: Clear Redis Cache (if Redis is running)

```bash
redis-cli FLUSHALL
```

### Step 4: Start Fresh Development Server

```bash
npm run dev
```

### Step 5: Wait for Compilation

Wait 20-30 seconds for the server to fully compile and start.

### Step 6: Test the Fix

```bash
curl -s http://localhost:3000/api/verusid/iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5/staking-momentum | jq '.data.momentum | {isActive, last7d}'
```

**Expected Result**:

```json
{
  "isActive": true,
  "last7d": 1
}
```

## Additional Changes for Debugging

The code also includes:

1. Console logs to verify the calculation (lines 148-149)
2. A test field `_testField: 'UPDATED_CODE_V3'` in the response (line 155)

Once confirmed working, these debug additions can be removed.

## Clean Up (After Fix is Verified)

Remove the debug code:

1. Simplify the `isActive` calculation (remove the IIFE wrapper and console.logs):

```typescript
isActive: momentumAnalysis.periods.last7d > 0;
```

2. Remove the `_testField` from line 155

## Verification Steps

1. Check that `isActive: true` when `last7d > 0`
2. Check that `isActive: false` when `last7d === 0`
3. Verify the UI shows "Active" status instead of "Inactive"
4. Test with multiple VerusIDs to ensure consistency

## For Production Deployment

1. Test thoroughly in development
2. Remove all debug code
3. Build for production: `npm run build`
4. Start production server: `npm start`
5. Verify the fix works in production

## Test Data

- **VerusID**: joanna@
- **I-Address**: iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5
- **Expected**: Active staking status
- **Stakes Last 7 Days**: 1
- **Total Stakes**: 266
- **Total Rewards**: 2,546.49 VRSC

## Notes

- The fix changes the momentum calculation logic to use `last7d` count directly
- This is more reliable than using `lastStakeDays` which had calculation issues
- The old logic was: `isActive: momentumAnalysis.lastStakeDays !== null && momentumAnalysis.lastStakeDays <= 7`
- New logic is: `isActive: momentumAnalysis.periods.last7d > 0`

## Troubleshooting

If the fix still doesn't work after following all steps:

1. **Check for multiple processes**: `ps aux | grep next`
2. **Verify the code changes**: `grep "last7d > 0" /home/explorer/verus-dapp/app/api/verusid/[iaddr]/staking-momentum/route.ts`
3. **Check Redis**: `redis-cli KEYS "*momentum*"` and flush if needed
4. **Restart with logging**: `npm run dev 2>&1 | tee dev-server.log`
5. **Check the response**: Look for `_testField` in API response to confirm code is running
