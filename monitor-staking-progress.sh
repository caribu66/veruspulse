#!/bin/bash

# Standardized Staking Progress Monitor
# This is the ONLY way to monitor staking scanning progress

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    STAKING SCANNER PROGRESS MONITOR                        ║${NC}"
echo -e "${BLUE}║                    Monitoring the ONE definitive staking scanner            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if scanner is running
if pgrep -f "definitive-staking-scanner.js" > /dev/null; then
    echo -e "${GREEN}✅ DEFINITIVE staking scanner is running${NC}"
    
    # Show process info
    echo -e "${BLUE}📊 Process Information:${NC}"
    ps aux | grep "definitive-staking-scanner.js" | grep -v grep | while read line; do
        echo -e "${BLUE}   $line${NC}"
    done
else
    echo -e "${RED}❌ DEFINITIVE staking scanner is NOT running${NC}"
    echo -e "${BLUE}💡 Start it with: ./start-staking-scanner.sh${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Current Database Status:${NC}"
node check-database-status.js

echo ""
echo -e "${BLUE}💡 Commands:${NC}"
echo -e "${YELLOW}   ./start-staking-scanner.sh    - Start the scanner${NC}"
echo -e "${YELLOW}   ./monitor-staking-progress.sh - Monitor progress${NC}"
echo -e "${YELLOW}   ./stop-staking-scanner.sh     - Stop the scanner${NC}"
