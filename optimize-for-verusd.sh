#!/bin/bash
###############################################################################
# Optimize System for VerusCoin Daemon
# Kills memory-consuming processes that might interfere with verusd
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    System Optimization for VerusCoin Daemon                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking for memory-consuming processes...${NC}"

# Kill system monitors and resource-heavy applications
PROCESSES_TO_KILL=(
    "btop"
    "htop"
    "top"
    "nmon"
    "iotop"
    "nload"
    "glances"
    "bashtop"
    "bottom"
    "monitor-peers.sh"
)

KILLED_COUNT=0
for process in "${PROCESSES_TO_KILL[@]}"; do
    if pgrep -f "$process" > /dev/null; then
        echo -e "${YELLOW}🛑 Killing $process...${NC}"
        pkill -f "$process"
        ((KILLED_COUNT++))
        sleep 1
    fi
done

if [ $KILLED_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No memory-consuming processes found${NC}"
else
    echo -e "${GREEN}✅ Killed $KILLED_COUNT memory-consuming processes${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Checking VerusCoin daemon status...${NC}"

if pgrep -f verusd > /dev/null; then
    VERUSD_PID=$(pgrep -f verusd)
    echo -e "${GREEN}✅ VerusCoin daemon is running (PID: $VERUSD_PID)${NC}"
    
    # Get memory usage
    VERUSD_MEM=$(ps -p $VERUSD_PID -o %mem --no-headers | tr -d ' ')
    VERUSD_CPU=$(ps -p $VERUSD_PID -o %cpu --no-headers | tr -d ' ')
    
    echo -e "${BLUE}📊 VerusCoin daemon resource usage:${NC}"
    echo -e "   Memory: ${VERUSD_MEM}%"
    echo -e "   CPU: ${VERUSD_CPU}%"
    
    # Check if it's using too much CPU (might indicate sync issues)
    if (( $(echo "$VERUSD_CPU > 80" | bc -l) )); then
        echo -e "${YELLOW}⚠️  High CPU usage detected - daemon might be syncing${NC}"
    fi
    
else
    echo -e "${RED}❌ VerusCoin daemon is not running${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 System memory status...${NC}"

# Check system memory
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
USED_MEM=$(free -m | awk 'NR==2{print $3}')
FREE_MEM=$(free -m | awk 'NR==2{print $4}')
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')

echo -e "${BLUE}📊 Memory Status:${NC}"
echo -e "   Total: ${TOTAL_MEM}MB"
echo -e "   Used: ${USED_MEM}MB"
echo -e "   Free: ${FREE_MEM}MB"
echo -e "   Available: ${AVAILABLE_MEM}MB"

# Check if we have enough memory for verusd
if [ $AVAILABLE_MEM -lt 1024 ]; then
    echo -e "${YELLOW}⚠️  Low available memory (${AVAILABLE_MEM}MB) - consider closing other applications${NC}"
else
    echo -e "${GREEN}✅ Sufficient memory available for VerusCoin daemon${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Checking for any remaining monitoring processes...${NC}"

# Check for any remaining monitoring processes
REMAINING_MONITORS=$(ps aux | grep -E "(monitor|tail.*log|watch)" | grep -v grep | wc -l)
if [ $REMAINING_MONITORS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $REMAINING_MONITORS remaining monitoring processes${NC}"
    echo -e "${BLUE}💡 Consider closing them to free up resources${NC}"
else
    echo -e "${GREEN}✅ No monitoring processes consuming resources${NC}"
fi

echo ""
echo -e "${GREEN}🎉 System optimization complete!${NC}"
echo ""
echo -e "${BLUE}💡 Tips for optimal VerusCoin daemon performance:${NC}"
echo -e "   • Avoid running system monitors while syncing"
echo -e "   • Close unnecessary applications"
echo -e "   • Monitor with: ./monitor-peers.sh (lightweight)"
echo -e "   • Check connections: /home/explorer/verus-cli/verus getconnectioncount"
echo ""
echo -e "${GREEN}✨ VerusCoin daemon should now run smoothly!${NC}"
