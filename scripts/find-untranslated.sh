#!/bin/bash

# Script to find components with hardcoded English text
# Usage: bash scripts/find-untranslated.sh

echo "🔍 Finding components with hardcoded English text..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if components have translation import
echo -e "${YELLOW}📋 Components WITHOUT translation imports:${NC}"
echo "----------------------------------------"
find components -name "*.tsx" -type f | while read file; do
    if ! grep -q "useTranslations" "$file"; then
        echo "  ❌ $file"
    fi
done
echo ""

# Find common hardcoded English phrases
echo -e "${YELLOW}🔤 Common hardcoded English phrases found:${NC}"
echo "----------------------------------------"

# Dashboard phrases
echo -e "${GREEN}Dashboard section:${NC}"
grep -rn "Recent Blocks\|Recent Transactions\|Overview\|All Blocks\|PoW Only\|PoS Only" components/ --include="*.tsx" | head -20

echo ""
echo -e "${GREEN}Network section:${NC}"
grep -rn "\"Total Blocks\"\|\"Total Transactions\"\|\"Network Hashrate\"\|\"Mempool Size\"" components/ --include="*.tsx" | head -20

echo ""
echo -e "${GREEN}Common UI:${NC}"
grep -rn "\"Loading...\"\|\"Refresh\"\|\"Retry\"\|\"Error\"" components/ --include="*.tsx" | head -20

echo ""
echo -e "${GREEN}Blocks section:${NC}"
grep -rn "\"Block Height\"\|\"Difficulty\"\|\"Transactions\"\|\"Reward\"" components/ --include="*.tsx" | head -20

echo ""
echo "----------------------------------------"
echo -e "${YELLOW}💡 Priority components to convert:${NC}"
echo ""

PRIORITY_COMPONENTS=(
    "components/verusid-explorer.tsx"
    "components/dashboard-tabs.tsx"
    "components/recent-stakes-timeline.tsx"
    "components/verusid-staking-dashboard.tsx"
    "components/hero-section.tsx"
    "components/quick-stats-ticker.tsx"
    "components/mempool-explorer.tsx"
    "components/transactions-explorer.tsx"
    "lib/utils/error-handler.tsx"
)

for component in "${PRIORITY_COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        if grep -q "useTranslations" "$component"; then
            echo -e "  ✅ ${GREEN}$component${NC} (already converted)"
        else
            echo -e "  ⏳ ${RED}$component${NC} (needs conversion)"
        fi
    fi
done

echo ""
echo "----------------------------------------"
echo -e "${YELLOW}📊 Summary:${NC}"
echo ""

# Count total components
TOTAL=$(find components -name "*.tsx" -type f | wc -l)
# Count converted components (with useTranslations)
CONVERTED=$(find components -name "*.tsx" -type f -exec grep -l "useTranslations" {} \; | wc -l)
# Calculate remaining
REMAINING=$((TOTAL - CONVERTED))

echo "  Total components: $TOTAL"
echo "  Converted: $CONVERTED"
echo "  Remaining: $REMAINING"
echo "  Progress: $((CONVERTED * 100 / TOTAL))%"

echo ""
echo -e "${GREEN}✨ Next step: Choose a component from the list above and convert it!${NC}"
echo "   See: QUICK-CONVERSION-STEPS.md for instructions"
echo ""

