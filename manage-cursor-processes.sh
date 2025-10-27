#!/bin/bash
###############################################################################
# Manage Cursor Processes for VerusCoin Daemon Performance
# Helps free up RAM by managing Cursor editor processes
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Cursor Process Management for VerusCoin                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking Cursor processes...${NC}"

# Get Cursor process information
CURSOR_PROCESSES=$(ps aux | grep -i cursor | grep -v grep)
CURSOR_COUNT=$(echo "$CURSOR_PROCESSES" | wc -l)

if [ $CURSOR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No Cursor processes found${NC}"
    exit 0
fi

echo -e "${BLUE}📊 Found $CURSOR_COUNT Cursor processes:${NC}"
echo ""

# Show memory usage of each Cursor process
TOTAL_CURSOR_MEM=0
while IFS= read -r line; do
    if [ -n "$line" ]; then
        PID=$(echo "$line" | awk '{print $2}')
        MEM=$(echo "$line" | awk '{print $4}')
        CPU=$(echo "$line" | awk '{print $3}')
        CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        
        # Calculate memory in MB
        MEM_MB=$(echo "$line" | awk '{print $6/1024}' | cut -d. -f1)
        
        echo -e "${YELLOW}PID: $PID | Memory: ${MEM}% (${MEM_MB}MB) | CPU: ${CPU}%${NC}"
        echo -e "${BLUE}   Command: ${CMD}${NC}"
        echo ""
        
        # Add to total memory calculation
        TOTAL_CURSOR_MEM=$((TOTAL_CURSOR_MEM + MEM_MB))
    fi
done <<< "$CURSOR_PROCESSES"

echo -e "${BLUE}📊 Total Cursor memory usage: ~${TOTAL_CURSOR_MEM}MB${NC}"

echo ""
echo -e "${YELLOW}🔍 Current system memory status:${NC}"
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
USED_MEM=$(free -m | awk 'NR==2{print $3}')
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')

echo -e "${BLUE}📊 System Memory:${NC}"
echo -e "   Total: ${TOTAL_MEM}MB"
echo -e "   Used: ${USED_MEM}MB"
echo -e "   Available: ${AVAILABLE_MEM}MB"

echo ""
echo -e "${YELLOW}🔍 VerusCoin daemon status:${NC}"
if pgrep -f verusd > /dev/null; then
    VERUSD_PID=$(pgrep -f verusd)
    VERUSD_MEM=$(ps -p $VERUSD_PID -o %mem --no-headers | tr -d ' ')
    VERUSD_MEM_MB=$(ps -p $VERUSD_PID -o rss --no-headers | awk '{print $1/1024}' | cut -d. -f1)
    echo -e "${GREEN}✅ VerusCoin daemon running (PID: $VERUSD_PID)${NC}"
    echo -e "${BLUE}   Memory usage: ${VERUSD_MEM}% (~${VERUSD_MEM_MB}MB)${NC}"
else
    echo -e "${RED}❌ VerusCoin daemon not running${NC}"
fi

echo ""
echo -e "${BLUE}💡 Options to free up memory for VerusCoin daemon:${NC}"
echo ""
echo -e "${YELLOW}1. Temporarily minimize Cursor windows (keeps processes but reduces memory)${NC}"
echo -e "   • Close unnecessary tabs in Cursor"
echo -e "   • Minimize Cursor windows"
echo ""
echo -e "${YELLOW}2. Restart Cursor (frees up memory but you'll need to reopen files)${NC}"
echo -e "   • Close Cursor completely and reopen"
echo ""
echo -e "${YELLOW}3. Kill specific Cursor processes (advanced - use with caution)${NC}"
echo -e "   • This will close Cursor completely"
echo ""
echo -e "${YELLOW}4. Do nothing (if you have enough memory)${NC}"
echo -e "   • VerusCoin daemon should work fine with current setup"

echo ""
echo -e "${GREEN}✨ Recommendation:${NC}"
if [ $AVAILABLE_MEM -gt 2048 ]; then
    echo -e "${GREEN}   You have ${AVAILABLE_MEM}MB available memory - VerusCoin should run fine!${NC}"
else
    echo -e "${YELLOW}   You have ${AVAILABLE_MEM}MB available memory - consider closing some Cursor tabs${NC}"
fi

echo ""
echo -e "${BLUE}💡 To kill Cursor processes (if needed):${NC}"
echo -e "   pkill -f cursor-server"
echo -e "   (This will close Cursor completely)"
