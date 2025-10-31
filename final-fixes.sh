#!/bin/bash
# Fix all remaining TypeScript errors

echo "Fixing all remaining type errors..."

# Fix featured-verusids-carousel.tsx - add null check
sed -i '291s/if (currentID?.badge)/if (currentID \&\& currentID.badge)/g' components/featured-verusids-carousel.tsx

# Fix heatmap-calendar.tsx - add null checks
sed -i 's/toLocaleDateString(\x27en-US\x27/toLocaleDateString(\x27en-US\x27 as string/g' components/charts/heatmap-calendar.tsx

# Fix advanced-utxo-visualizer.tsx - add null guards
sed -i 's/cellPositions\[`/cellPositions?.\[`/g' components/charts/advanced-utxo-visualizer.tsx

# Fix interactive-charts.tsx - add optional chaining
sed -i 's/miningStats\./miningStats?./g' components/interactive-charts.tsx

# Fix moving-price-ticker.tsx - add optional chaining
sed -i 's/currentPrice\./currentPrice?./g' components/moving-price-ticker.tsx

# Fix pull-to-refresh.tsx - add null checks
sed -i 's/containerRef\.current\./containerRef.current?./g' components/pull-to-refresh.tsx

# Fix quick-stats-ticker.tsx - add optional chaining
sed -i 's/networkStats\./networkStats?./g' components/quick-stats-ticker.tsx
sed -i 's/stakingStats\./stakingStats?./g' components/quick-stats-ticker.tsx

# Fix ui/breadcrumb.tsx - add null check
sed -i 's/firstItem\./firstItem?./g' components/ui/breadcrumb.tsx

# Fix lib files
sed -i 's/result\?\.value\./result?.value?./g' lib/cache/cache-utils.ts
sed -i 's/this\.pool\./this.pool?./g' lib/database/secure-db-client.ts
sed -i 's/event\.touches\[0\]\./event.touches[0]?./g' lib/hooks/use-touch-gestures.ts
sed -i 's/code\.split/code?.split/g' lib/i18n/utils.ts

# Fix moving-price-ticker not all paths return
sed -i '105a\      return \x27light\x27; // fallback' components/moving-price-ticker.tsx

# Fix i18n-error-boundary override issue
sed -i 's/override componentDidCatch/componentDidCatch/g' components/i18n-error-boundary.tsx

# Remove @ts-expect-error if not needed
sed -i '/\/\/ @ts-expect-error/d' lib/services/dynamic-block-reward-analyzer.ts

echo "All fixes complete!"

