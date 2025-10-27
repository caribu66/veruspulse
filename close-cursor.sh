#!/bin/bash
###############################################################################
# Close Cursor Properly
# Simple script to ensure Cursor closes cleanly
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Closing Cursor properly...${NC}"

# Check if Cursor is running
if pgrep -f cursor-server > /dev/null; then
    echo -e "${YELLOW}📋 Cursor processes detected, closing...${NC}"
    
    # Try graceful shutdown first
    pkill -TERM -f cursor-server 2>/dev/null
    sleep 2
    
    # Check if still running
    if pgrep -f cursor-server > /dev/null; then
        echo -e "${YELLOW}📋 Force closing remaining processes...${NC}"
        pkill -KILL -f cursor-server 2>/dev/null
        sleep 1
    fi
    
    # Final check
    if pgrep -f cursor-server > /dev/null; then
        echo -e "${RED}❌ Some Cursor processes still running${NC}"
        echo -e "${BLUE}💡 Run: ./clean-cursor-exit.sh for detailed cleanup${NC}"
    else
        echo -e "${GREEN}✅ Cursor closed successfully${NC}"
    fi
else
    echo -e "${GREEN}✅ Cursor is already closed${NC}"
fi

echo -e "${BLUE}💡 Cursor should now be properly closed${NC}"
