#!/bin/bash
###############################################################################
# Stop VerusCoin Daemon Cleanly
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping VerusCoin daemon...${NC}"

# Try to stop gracefully first
VERUS_CLI_PATH="/home/explorer/verus-cli/verus"
if [ -f "$VERUS_CLI_PATH" ]; then
    echo -e "${YELLOW}📋 Attempting graceful stop...${NC}"
    "$VERUS_CLI_PATH" stop 2>/dev/null || echo -e "${YELLOW}⚠️  Graceful stop failed (daemon might not be responding)${NC}"
    sleep 3
fi

# Check if still running
if pgrep -f verusd > /dev/null; then
    echo -e "${YELLOW}📋 Daemon still running, forcing stop...${NC}"
    pkill -f verusd
    sleep 2
    
    if pgrep -f verusd > /dev/null; then
        echo -e "${YELLOW}📋 Force stopping...${NC}"
        pkill -9 -f verusd
        sleep 1
    fi
fi

# Final check
if pgrep -f verusd > /dev/null; then
    echo -e "${RED}❌ Failed to stop daemon${NC}"
    echo -e "${BLUE}💡 Manual stop required${NC}"
    exit 1
else
    echo -e "${GREEN}✅ VerusCoin daemon stopped successfully${NC}"
fi

echo -e "${BLUE}💡 You can now start the daemon with: ./start-verusd-optimized.sh${NC}"
