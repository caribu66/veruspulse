#!/bin/bash

# Standardized Staking Scanner Startup
# This is the ONLY way to start staking data scanning

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    DEFINITIVE STAKING SCANNER                               ║${NC}"
echo -e "${BLUE}║                    The ONE and ONLY staking scanning method                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if scanner is already running
if pgrep -f "definitive-staking-scanner.js" > /dev/null; then
    echo -e "${YELLOW}⚠️  Staking scanner is already running!${NC}"
    echo -e "${BLUE}💡 Use: ./monitor-staking-progress.sh to check progress${NC}"
    exit 0
fi

# Check if VerusCoin daemon is running
VERUS_CLI_PATH="/home/explorer/verus-cli/verus"
if ! "$VERUS_CLI_PATH" getblockchaininfo > /dev/null 2>&1; then
    echo -e "${RED}❌ VerusCoin daemon is not running!${NC}"
    echo -e "${BLUE}💡 Start it first with: ./start-verusd-optimized.sh${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Starting DEFINITIVE staking scanner...${NC}"
echo -e "${BLUE}📊 This uses our verified methodology:${NC}"
echo -e "${BLUE}   ✅ Blockchain verification${NC}"
echo -e "${BLUE}   ✅ VRSC halving event accounting${NC}"
echo -e "${BLUE}   ✅ Correct stake amount calculation${NC}"
echo ""

# Start the scanner
node definitive-staking-scanner.js

echo -e "${GREEN}✅ Staking scanner started!${NC}"
echo -e "${BLUE}💡 Monitor progress with: ./monitor-staking-progress.sh${NC}"
