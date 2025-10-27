#!/bin/bash

# Standardized Staking Scanner Stop
# This is the ONLY way to stop staking scanning

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    STOPPING STAKING SCANNER                                 ║${NC}"
echo -e "${BLUE}║                    Stopping the ONE definitive staking scanner              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop all definitive staking scanners
echo -e "${YELLOW}🛑 Stopping definitive staking scanner...${NC}"

# Kill all definitive staking scanner processes
pkill -f "definitive-staking-scanner.js"

# Wait a moment for processes to stop
sleep 2

# Check if any are still running
if pgrep -f "definitive-staking-scanner.js" > /dev/null; then
    echo -e "${RED}❌ Some processes still running, force killing...${NC}"
    pkill -9 -f "definitive-staking-scanner.js"
    sleep 1
fi

# Final check
if pgrep -f "definitive-staking-scanner.js" > /dev/null; then
    echo -e "${RED}❌ Failed to stop all processes${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All staking scanner processes stopped${NC}"
fi

echo -e "${BLUE}💡 To start again: ./start-staking-scanner.sh${NC}"
