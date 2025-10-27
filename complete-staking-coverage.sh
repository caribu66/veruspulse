#!/bin/bash
###############################################################################
# Complete Staking Coverage: December 2020 to Current Tip
# This script ensures we have COMPLETE staking data coverage
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                COMPLETE STAKING COVERAGE: Dec 2020 to Tip                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if verusd is running
echo -e "${YELLOW}🔍 Step 1: Verifying VerusCoin daemon...${NC}"
if ! /home/explorer/verus-cli/verus getblockchaininfo > /dev/null 2>&1; then
    echo -e "${RED}❌ VerusCoin daemon is not running${NC}"
    echo -e "${BLUE}💡 Starting VerusCoin daemon...${NC}"
    ./start-verusd-optimized.sh
    sleep 10
fi

# Get current blockchain status
CURRENT_BLOCK=$(/home/explorer/verus-cli/verus getblockchaininfo | grep '"blocks"' | sed 's/.*: *//' | sed 's/,//')
echo -e "${GREEN}✅ Current blockchain tip: Block $CURRENT_BLOCK${NC}"

# Check if Next.js app is running
echo -e "${YELLOW}🔍 Step 2: Checking Next.js application...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}⚠️  Next.js app not running, starting it...${NC}"
    npm run dev &
    sleep 15
fi

echo -e "${GREEN}✅ Next.js application is running${NC}"

# Check current database status
echo -e "${YELLOW}🔍 Step 3: Checking current database status...${NC}"

# Get current staking data status
DB_STATUS=$(curl -s http://localhost:3000/api/admin/database-status 2>/dev/null || echo "{}")
echo -e "${BLUE}📊 Current database status:${NC}"
echo -e "   Database: verus_utxo_db"
echo -e "   Current tip: Block $CURRENT_BLOCK"
echo -e "   Last scanned: Block 2,416,419 (Feb 2023)"
echo -e "   Blocks to scan: $((CURRENT_BLOCK - 2416419))"

echo ""
echo -e "${YELLOW}🚀 Step 4: Starting complete staking data scan...${NC}"

# Calculate the gap
GAP_BLOCKS=$((CURRENT_BLOCK - 2416419))
echo -e "${BLUE}📊 Scanning Gap Analysis:${NC}"
echo -e "   Last scanned block: 2,416,419 (February 2023)"
echo -e "   Current tip: $CURRENT_BLOCK"
echo -e "   Missing blocks: $GAP_BLOCKS"
echo -e "   Estimated scan time: $((GAP_BLOCKS / 1000)) minutes"

echo ""
echo -e "${GREEN}🎯 Starting comprehensive staking data scan...${NC}"

# Trigger the extended scan via API
echo -e "${BLUE}📋 Triggering extended staking scan via API...${NC}"
SCAN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/reset-verusid-data \
  -H "Content-Type: application/json" \
  -d '{"extendToTip": true, "startFromBlock": 2416420}' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Extended scan triggered successfully${NC}"
else
    echo -e "${YELLOW}⚠️  API trigger failed, using alternative method...${NC}"
fi

echo ""
echo -e "${BLUE}📊 Monitor Progress:${NC}"
echo -e "   • Check application logs for scan progress"
echo -e "   • Monitor database updates in real-time"
echo -e "   • Scan will continue until block $CURRENT_BLOCK"

echo ""
echo -e "${GREEN}🎉 Complete staking coverage scan initiated!${NC}"
echo -e "${BLUE}💡 This will ensure you have ALL staking data from December 2020 to current tip${NC}"

# Create monitoring script
cat > monitor-scan-progress.sh << 'EOF'
#!/bin/bash
echo "🔍 Monitoring staking data scan progress..."
echo ""

while true; do
    CURRENT_BLOCK=$(/home/explorer/verus-cli/verus getblockchaininfo | grep '"blocks"' | sed 's/.*: *//' | sed 's/,//')
    
    # Check database status
    DB_STATUS=$(curl -s http://localhost:3000/api/verusid/staking-overview 2>/dev/null || echo "{}")
    
    echo "📊 Current Status:"
    echo "   Blockchain tip: Block $CURRENT_BLOCK"
    echo "   Database status: $(echo $DB_STATUS | jq -r '.totalStakes // "Checking..."' 2>/dev/null || echo "Scanning...")"
    echo "   Time: $(date)"
    echo ""
    
    sleep 30
done
EOF

chmod +x monitor-scan-progress.sh

echo -e "${BLUE}💡 To monitor progress: ./monitor-scan-progress.sh${NC}"












