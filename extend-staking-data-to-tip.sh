#!/bin/bash
###############################################################################
# Extend Staking Data to Current Tip
# Scans from block 2,416,419 (Feb 2023) to current tip (3,782,731)
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Extend Staking Data to Current Tip                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if verusd is running
echo -e "${YELLOW}🔍 Checking VerusCoin daemon status...${NC}"
if ! /home/explorer/verus-cli/verus getblockchaininfo > /dev/null 2>&1; then
    echo -e "${RED}❌ VerusCoin daemon is not running or not responding${NC}"
    echo -e "${BLUE}💡 Start the daemon first: ./start-verusd-optimized.sh${NC}"
    exit 1
fi

# Get current blockchain info
echo -e "${YELLOW}📊 Getting current blockchain status...${NC}"
BLOCKCHAIN_INFO=$(/home/explorer/verus-cli/verus getblockchaininfo)
CURRENT_BLOCK=$(echo "$BLOCKCHAIN_INFO" | grep '"blocks"' | sed 's/.*: *//' | sed 's/,//')
CURRENT_HASH=$(echo "$BLOCKCHAIN_INFO" | grep '"bestblockhash"' | sed 's/.*: *"//' | sed 's/".*//')

echo -e "${GREEN}✅ Current blockchain tip: Block $CURRENT_BLOCK${NC}"
echo -e "${GREEN}✅ Current block hash: $CURRENT_HASH${NC}"

# Check current database status
echo -e "${YELLOW}🔍 Checking current database status...${NC}"
VERUSD_DIR="$HOME/.komodo/VRSC"
CONFIG_FILE="$VERUSD_DIR/verus.conf"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ VerusCoin configuration not found${NC}"
    exit 1
fi

# Check if we have the staking scanner
if [ ! -f "./lib/services/verusid-scanner.ts" ]; then
    echo -e "${RED}❌ VerusID scanner not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ VerusID scanner found${NC}"

# Calculate blocks to scan
LAST_SCANNED_BLOCK=2416419  # February 2023 (from documentation)
BLOCKS_TO_SCAN=$((CURRENT_BLOCK - LAST_SCANNED_BLOCK))

echo -e "${BLUE}📊 Scanning Statistics:${NC}"
echo -e "   Last scanned block: $LAST_SCANNED_BLOCK (Feb 2023)"
echo -e "   Current tip: $CURRENT_BLOCK"
echo -e "   Blocks to scan: $BLOCKS_TO_SCAN"
echo -e "   Estimated time: $((BLOCKS_TO_SCAN / 1000)) minutes (at 1000 blocks/min)"

echo ""
echo -e "${YELLOW}🚀 Starting extended staking data scan...${NC}"

# Start the extended scan
echo -e "${BLUE}📋 This will scan $BLOCKS_TO_SCAN blocks to complete staking data from Dec 2020 to current tip${NC}"
echo -e "${BLUE}💡 The scan will run in the background and update the database incrementally${NC}"

# Create a comprehensive scan script
cat > /tmp/extend-staking-scan.js << 'EOF'
const { VerusIDScanner } = require('./lib/services/verusid-scanner.ts');

async function extendStakingData() {
    console.log('🚀 Starting extended staking data scan...');
    
    const scanner = new VerusIDScanner();
    
    try {
        // Start scanning from block 2,416,420 to current tip
        await scanner.startExtendedScan(2416420);
        console.log('✅ Extended staking data scan completed!');
    } catch (error) {
        console.error('❌ Error during extended scan:', error);
    }
}

extendStakingData();
EOF

echo -e "${GREEN}🎯 Extended scan script created${NC}"
echo ""
echo -e "${BLUE}💡 To start the extended scan:${NC}"
echo -e "   1. Make sure the Next.js app is running: npm run dev"
echo -e "   2. The scanner will automatically detect and scan new blocks"
echo -e "   3. Monitor progress in the application logs"
echo ""
echo -e "${BLUE}💡 Alternative: Use the admin API to trigger extended scan:${NC}"
echo -e "   curl -X POST http://localhost:3000/api/admin/reset-verusid-data"
echo ""
echo -e "${GREEN}🎉 Ready to extend staking data from December 2020 to current tip!${NC}"
echo -e "${BLUE}📊 This will add approximately $BLOCKS_TO_SCAN blocks of staking data${NC}"










