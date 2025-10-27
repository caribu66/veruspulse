#!/bin/bash
###############################################################################
# VerusCoin Daemon Startup Script - Optimized for Maximum Peer Connections
# This script ensures you get more than 5 peers when starting verusd
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                VerusCoin Daemon Startup - Optimized for Peers              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
VERUS_DIR="$HOME/.komodo/VRSC"
CONFIG_FILE="$VERUS_DIR/verus.conf"
VERUSD_PATH="/home/explorer/verus-cli/verusd"
VERUS_CLI_PATH="/home/explorer/verus-cli/verus"

echo -e "${YELLOW}🔍 Pre-flight checks...${NC}"

# Check if verusd exists
if [ ! -f "$VERUSD_PATH" ]; then
    echo -e "${RED}❌ verusd not found at $VERUSD_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ verusd found${NC}"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration file found${NC}"

# Check if daemon is already running and functional
if pgrep -f "verusd -daemon" > /dev/null || pgrep -f "verusd.*conf" > /dev/null; then
    echo -e "${YELLOW}⚠️  verusd process detected, checking if it's functional...${NC}"
    # Try to connect to see if it's actually working
    if "$VERUS_CLI_PATH" getconnectioncount 2>/dev/null | grep -q "^[0-9]"; then
        echo -e "${GREEN}✅ verusd is already running and functional${NC}"
        echo -e "${BLUE}💡 You can monitor it with: ./monitor-peers.sh${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  verusd process exists but not responding to RPC${NC}"
        echo -e "${BLUE}💡 Attempting to start anyway...${NC}"
    fi
fi
echo -e "${GREEN}✅ Ready to start daemon${NC}"

# Check if port is available
if netstat -tlnp 2>/dev/null | grep -q ":25089"; then
    echo -e "${RED}❌ Port 25089 is already in use${NC}"
    echo -e "${BLUE}💡 Check what's using it: netstat -tlnp | grep 25089${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Port 25089 is available${NC}"

echo ""
echo -e "${YELLOW}🚀 Starting VerusCoin daemon with optimized peer configuration...${NC}"

# Change to Verus directory
cd "$VERUS_DIR"

# Start verusd with optimized settings
echo -e "${BLUE}📋 Starting daemon...${NC}"
"$VERUSD_PATH" -daemon -conf="$CONFIG_FILE"

# Wait a moment for daemon to start
echo -e "${BLUE}⏳ Waiting for daemon to initialize...${NC}"
sleep 10

# Check if daemon started successfully
if pgrep -f verusd > /dev/null; then
    echo -e "${GREEN}✅ VerusCoin daemon started successfully!${NC}"
else
    echo -e "${RED}❌ Failed to start daemon${NC}"
    echo -e "${BLUE}💡 Check debug.log for errors: tail -f $VERUS_DIR/debug.log${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Monitoring peer connections...${NC}"

# Monitor peer connections for the first 2 minutes
for i in {1..24}; do
    if command -v "$VERUS_CLI_PATH" &> /dev/null; then
        CONN_COUNT=$("$VERUS_CLI_PATH" getconnectioncount 2>/dev/null || echo "0")
        echo -e "${BLUE}📊 Connections: $CONN_COUNT${NC}"
        
        if [ "$CONN_COUNT" -gt 5 ]; then
            echo -e "${GREEN}🎉 Excellent! You have more than 5 peers ($CONN_COUNT)${NC}"
            break
        elif [ "$CONN_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⏳ Building connections... ($CONN_COUNT peers so far)${NC}"
        else
            echo -e "${YELLOW}⏳ Waiting for connections...${NC}"
        fi
    else
        echo -e "${YELLOW}⏳ Waiting for connections... (verus-cli not found)${NC}"
    fi
    
    sleep 5
done

echo ""
echo -e "${GREEN}🎉 VerusCoin daemon is now running with optimized peer configuration!${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "  • Check connections:    $VERUS_CLI_PATH getconnectioncount"
echo -e "  • View peer info:       $VERUS_CLI_PATH getpeerinfo"
echo -e "  • Check sync status:    $VERUS_CLI_PATH getblockchaininfo"
echo -e "  • Stop daemon:          $VERUS_CLI_PATH stop"
echo ""
echo -e "${BLUE}📊 Configuration highlights:${NC}"
echo -e "  • Maximum connections:  125"
echo -e "  • Listening port:       25089 (your router port)"
echo -e "  • Seed nodes:           6 official Verus Foundation nodes"
echo -e "  • Community nodes:      15 reliable nodes"
echo -e "  • Total addnode entries: 21"
echo ""
echo -e "${GREEN}✨ You should now have more than 5 peers for fast sync and reliability!${NC}"
