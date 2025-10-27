#!/bin/bash
###############################################################################
# Clean Cursor Exit Script
# Ensures Cursor processes are properly terminated when exiting
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Clean Cursor Exit Management                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking for Cursor processes...${NC}"

# Check if Cursor is running
CURSOR_PROCESSES=$(ps aux | grep -i cursor | grep -v grep | grep -v "clean-cursor-exit.sh")
CURSOR_COUNT=$(echo "$CURSOR_PROCESSES" | wc -l)

if [ $CURSOR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No Cursor processes found - Cursor is properly closed${NC}"
    exit 0
fi

echo -e "${BLUE}📊 Found $CURSOR_COUNT Cursor processes still running${NC}"

# Show what processes are still running
echo -e "${YELLOW}🔍 Remaining Cursor processes:${NC}"
while IFS= read -r line; do
    if [ -n "$line" ]; then
        PID=$(echo "$line" | awk '{print $2}')
        MEM=$(echo "$line" | awk '{print $4}')
        CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}' | cut -c1-80)
        echo -e "${BLUE}   PID: $PID | Memory: ${MEM}% | $CMD${NC}"
    fi
done <<< "$CURSOR_PROCESSES"

echo ""
echo -e "${YELLOW}🔍 Attempting graceful shutdown...${NC}"

# Try to kill Cursor processes gracefully
echo -e "${BLUE}📋 Sending SIGTERM to Cursor processes...${NC}"
pkill -TERM -f cursor-server 2>/dev/null || echo -e "${YELLOW}⚠️  No cursor-server processes found${NC}"
pkill -TERM -f "cursor.*node" 2>/dev/null || echo -e "${YELLOW}⚠️  No cursor node processes found${NC}"

# Wait a moment for graceful shutdown
sleep 3

# Check if processes are still running
REMAINING_PROCESSES=$(ps aux | grep -i cursor | grep -v grep | grep -v "clean-cursor-exit.sh" | wc -l)

if [ $REMAINING_PROCESSES -eq 0 ]; then
    echo -e "${GREEN}✅ All Cursor processes terminated gracefully${NC}"
else
    echo -e "${YELLOW}⚠️  $REMAINING_PROCESSES processes still running, forcing termination...${NC}"
    
    # Force kill remaining processes
    echo -e "${BLUE}📋 Force killing remaining Cursor processes...${NC}"
    pkill -KILL -f cursor-server 2>/dev/null
    pkill -KILL -f "cursor.*node" 2>/dev/null
    
    sleep 2
    
    # Final check
    FINAL_CHECK=$(ps aux | grep -i cursor | grep -v grep | grep -v "clean-cursor-exit.sh" | wc -l)
    if [ $FINAL_CHECK -eq 0 ]; then
        echo -e "${GREEN}✅ All Cursor processes force terminated${NC}"
    else
        echo -e "${RED}❌ Some Cursor processes could not be terminated${NC}"
        echo -e "${BLUE}💡 You may need to restart your system to fully clean up${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}🔍 Checking for any remaining Cursor-related files...${NC}"

# Check for Cursor lock files or temporary files
CURSOR_LOCK_FILES=$(find /tmp -name "*cursor*" -type f 2>/dev/null | wc -l)
if [ $CURSOR_LOCK_FILES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CURSOR_LOCK_FILES Cursor temporary files${NC}"
    echo -e "${BLUE}💡 Consider cleaning them with: find /tmp -name '*cursor*' -type f -delete${NC}"
else
    echo -e "${GREEN}✅ No Cursor temporary files found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cursor cleanup complete!${NC}"
echo ""
echo -e "${BLUE}💡 Tips for proper Cursor exit:${NC}"
echo -e "   • Always use File → Exit or Ctrl+Q to close Cursor"
echo -e "   • Don't force-kill Cursor windows"
echo -e "   • Run this script if you notice Cursor processes still running"
echo -e "   • Check with: ps aux | grep cursor | grep -v grep"

echo ""
echo -e "${BLUE}💡 To prevent Cursor from leaving processes running:${NC}"
echo -e "   • Close all tabs before exiting"
echo -e "   • Don't have multiple Cursor windows open"
echo -e "   • Use this script regularly to clean up any lingering processes"
