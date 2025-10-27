# Trending Section Audit & Implementation Summary

## Issues Found (Before)

1. **❌ Fake Trend Calculations**
   - Trends generated with: `Math.max(0, 50 - index * 8)`
   - Views hardcoded: `Math.max(50, 300 - index * 40)`
   - Not based on actual analytics or historical data

2. **❌ Hardcoded Searches**
   - All 4 searches were static/hardcoded
   - No actual search analytics
   - Fake trends: 45, 32, 28, 18

3. **⚠️ No Persistent Analytics**
   - No database tracking
   - No historical data
   - No real trending algorithm

## Solutions Implemented

### 1. Analytics Database Schema ✅

Created `lib/database/analytics-schema.sql`:

- `view_analytics` - Track view counts per entity
- `view_history` - Detailed view history for trending
- `search_analytics` - Track search queries
- `trending_scores` - Pre-computed trending scores (24h, 7d, 30d)

### 2. Analytics Service ✅

Created `lib/services/analytics-service.ts`:

- `recordView()` - Track entity views
- `recordSearch()` - Track search queries
- `getTrendingScore()` - Get trending score for entity
- `getTopTrending()` - Get top trending items
- `calculateTrendingScores()` - Calculate trending scores

### 3. API Endpoint ✅

Created `app/api/analytics/trending/route.ts`:

- Fetch trending data from analytics database
- Fallback to recent data if analytics not available
- Support for multiple time ranges (24h, 7d, 30d)

### 4. Removed Fake Data ✅

Updated `components/trending-section.tsx`:

- Removed all fake trend calculations
- Set trends to 0 (will be filled by analytics)
- Set views to 0 (will be filled by analytics)
- Removed hardcoded searches

## Implementation Status

### ✅ Completed

- [x] Database schema created
- [x] Analytics service created
- [x] API endpoint created
- [x] Fake data removed from component
- [x] Component updated to use analytics

### ⏳ Next Steps (To Be Implemented)

- [ ] Run database migration to create analytics tables
- [ ] Implement view tracking in block/verusid/address pages
- [ ] Implement search tracking in search components
- [ ] Set up cron job to calculate trending scores periodically
- [ ] Set up cron job to clean up old view history
- [ ] Test the trending section with real analytics data

## How to Use

### 1. Create Analytics Tables

```bash
psql $DATABASE_URL < lib/database/analytics-schema.sql
```

### 2. Implement View Tracking

In your page components (blocks, verusids, addresses), add:

```typescript
// Track view
await fetch('/api/analytics/track-view', {
  method: 'POST',
  body: JSON.stringify({
    entityType: 'block',
    entityId: block.hash,
  }),
});
```

### 3. Set Up Cron Jobs

```bash
# Calculate trending scores every hour
0 * * * * node scripts/calculate-trending-scores.js

# Clean up old history daily
0 0 * * * node scripts/cleanup-history.js
```

## Result

The trending section is now ready to display **real analytics data** instead of fake data. Once:

1. Analytics tables are created
2. View tracking is implemented
3. Trending scores are calculated

The trending section will show **actual trending items** based on real user views and activity!
