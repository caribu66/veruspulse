#!/bin/bash
###############################################################################
# Prepare System for VerusCoin Daemon
# Ensures clean system state before starting verusd
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Prepare System for VerusCoin Daemon                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Cleaning up Cursor processes...${NC}"

# Run the Cursor cleanup script
if [ -f "./clean-cursor-exit.sh" ]; then
    ./clean-cursor-exit.sh
else
    echo -e "${YELLOW}⚠️  Cursor cleanup script not found, manually cleaning...${NC}"
    pkill -TERM -f cursor-server 2>/dev/null || echo -e "${GREEN}✅ No Cursor processes found${NC}"
    sleep 2
fi

echo ""
echo -e "${YELLOW}🔍 Step 2: Checking system resources...${NC}"

# Check memory
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
USED_MEM=$(free -m | awk 'NR==2{print $3}')
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')

echo -e "${BLUE}📊 System Memory:${NC}"
echo -e "   Total: ${TOTAL_MEM}MB"
echo -e "   Used: ${USED_MEM}MB"
echo -e "   Available: ${AVAILABLE_MEM}MB"

if [ $AVAILABLE_MEM -gt 2048 ]; then
    echo -e "${GREEN}✅ Sufficient memory available for VerusCoin daemon${NC}"
else
    echo -e "${YELLOW}⚠️  Low available memory - consider closing other applications${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 3: Checking for conflicting processes...${NC}"

# Check if verusd is already running
if pgrep -f verusd > /dev/null; then
    echo -e "${YELLOW}⚠️  VerusCoin daemon is already running${NC}"
    VERUSD_PID=$(pgrep -f verusd)
    echo -e "${BLUE}   PID: $VERUSD_PID${NC}"
    echo -e "${BLUE}💡 To stop it: pkill -f verusd${NC}"
else
    echo -e "${GREEN}✅ No VerusCoin daemon running${NC}"
fi

# Check for other resource-intensive processes
RESOURCE_PROCESSES=$(ps aux | awk '$3 > 10.0 || $4 > 5.0' | grep -v grep | wc -l)
if [ $RESOURCE_PROCESSES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $RESOURCE_PROCESSES high-resource processes${NC}"
    echo -e "${BLUE}💡 Consider closing them to free up resources${NC}"
else
    echo -e "${GREEN}✅ No high-resource processes detected${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 4: Checking port availability...${NC}"

# Check if port 25089 is available
if netstat -tlnp 2>/dev/null | grep -q ":25089"; then
    echo -e "${RED}❌ Port 25089 is already in use${NC}"
    echo -e "${BLUE}💡 Check what's using it: netstat -tlnp | grep 25089${NC}"
else
    echo -e "${GREEN}✅ Port 25089 is available${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 5: Verifying VerusCoin configuration...${NC}"

VERUS_DIR="$HOME/.komodo/VRSC"
CONFIG_FILE="$VERUS_DIR/verus.conf"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ VerusCoin configuration file found${NC}"
    
    # Check key settings
    if grep -q "^listen=1" "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ Listen enabled${NC}"
    else
        echo -e "${RED}❌ Listen not enabled${NC}"
    fi
    
    if grep -q "^port=25089" "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ Port 25089 configured${NC}"
    else
        echo -e "${RED}❌ Port 25089 not configured${NC}"
    fi
    
    ADDNODE_COUNT=$(grep -c "^addnode=" "$CONFIG_FILE" 2>/dev/null || echo "0")
    if [ $ADDNODE_COUNT -ge 10 ]; then
        echo -e "${GREEN}✅ $ADDNODE_COUNT seed nodes configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Only $ADDNODE_COUNT seed nodes configured${NC}"
    fi
else
    echo -e "${RED}❌ VerusCoin configuration file not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 System preparation complete!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo -e "   • Start VerusCoin daemon: ./start-verusd-optimized.sh"
echo -e "   • Monitor connections: ./monitor-peers.sh"
echo -e "   • Check status: /home/explorer/verus-cli/verus getconnectioncount"

echo ""
echo -e "${BLUE}💡 Tips for optimal performance:${NC}"
echo -e "   • Close Cursor properly before starting VerusCoin"
echo -e "   • Avoid running resource-intensive applications"
echo -e "   • Use this script regularly to maintain clean system state"
