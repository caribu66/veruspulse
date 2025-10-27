#!/bin/bash
###############################################################################
# Verus Setup Verification Script
# Check if everything is ready for optimal peer connections
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Verus Setup Verification                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

VERUS_DIR="$HOME/.komodo/VRSC"
CONFIG_FILE="$VERUS_DIR/verus.conf"

echo -e "${YELLOW}🔍 Checking current setup...${NC}"
echo ""

# Check if verusd exists
echo -e "${BLUE}1. VerusCoin daemon:${NC}"
if command -v verusd &> /dev/null; then
    echo -e "${GREEN}✅ verusd command found${NC}"
    VERUS_VERSION=$(verusd --version 2>/dev/null || echo "Unknown")
    echo -e "   Version: $VERUS_VERSION"
else
    echo -e "${RED}❌ verusd command not found${NC}"
fi

echo ""

# Check if daemon is running
echo -e "${BLUE}2. Daemon status:${NC}"
if pgrep -f verusd > /dev/null; then
    echo -e "${GREEN}✅ verusd is running${NC}"
    PID=$(pgrep -f verusdstate)
    echo -e "   Process ID: $PID"
else
    echo -e "${YELLOW}⚠️  verusd is not running${NC}"
fi

echo ""

# Check configuration file
echo -e "${BLUE}3. Configuration file:${NC}"
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ Configuration file exists${NC}"
    echo -e "   Location: $CONFIG_FILE"
    
    # Check critical settings
    echo -e "${BLUE}   Critical settings:${NC}"
    
    if grep -q "^maxconnections=" "$CONFIG_FILE"; then
        MAX_CONN=$(grep "^maxconnections=" "$CONFIG_FILE" | cut -d= -f2)
        if [ "$MAX_CONN" -ge 50 ]; then
            echo -e "${GREEN}   ✅ maxconnections=$MAX_CONN (good)${NC}"
        else
            echo -e "${YELLOW}   ⚠️  maxconnections=$MAX_CONN (should be >= 50)${NC}"
        fi
    else
        echo -e "${RED}   ❌ maxconnections not set${NC}"
    fi
    
    if grep -q "^listen=1" "$CONFIG_FILE"; then
        echo -e "${GREEN}   ✅ listen=1 (good)${NC}"
    else
        echo -e "${RED}   ❌ listen=1 not set${NC}"
    fi
    
    if grep -q "^port=25089" "$CONFIG_FILE"; then
        echo -e "${GREEN}   ✅ port=25089 (good - using your router port)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  port not set to 25089${NC}"
    fi
    
    # Count addnode entries
    ADDNODE_COUNT=$(grep -c "^addnode=" "$CONFIG_FILE" 2>/dev/null || echo "0")
    if [ "$ADDNODE_COUNT" -ge 10 ]; then
        echo -e "${GREEN}   ✅ $ADDNODE_COUNT addnode entries (good)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Only $ADDNODE_COUNT addnode entries (should be >= 10)${NC}"
    fi
    
else
    echo -e "${RED}❌ Configuration file not found${NC}"
fi

echo ""

# Check network connectivity
echo -e "${BLUE}4. Network connectivity:${NC}"
SEED_NODES=("185.25.48.236:27485" "185.64.105.111:27485" "149.56.29.163:27485")
REACHABLE=0

for node in "${SEED_NODES[@]}"; do
    IP=$(echo $node | cut -d: -f1)
    PORT=$(echo $node | cut -d: -f2)
    if timeout 3 bash -c "</dev/tcp/$IP/$PORT" 2>/dev/null; then
        echo -e "${GREEN}   ✅ Can reach $node${NC}"
        ((REACHABLE++))
    else
        echo -e "${YELLOW}   ⚠️  Cannot reach $node${NC}"
    fi
done

echo -e "   Reachable nodes: $REACHABLE/${#SEED_NODES[@]}"

echo ""

# Check firewall
echo -e "${BLUE}5. Firewall status:${NC}"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status 2>/dev/null | head -1)
    echo -e "   UFW Status: $UFW_STATUS"
    
    if ufw status | grep -q "25089.*ALLOW"; then
        echo -e "${GREEN}   ✅ Port 25089 is open in UFW${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Port 25089 not explicitly open in UFW${NC}"
        echo -e "${BLUE}   💡 Run: sudo ufw allow 25089/tcp${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  UFW not found. Check your firewall manually.${NC}"
fi

echo ""

# Check port availability
echo -e "${BLUE}6. Port availability:${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":25089"; then
    echo -e "${RED}   ❌ Port 25089 is already in use${NC}"
    echo -e "${BLUE}   💡 Check what's using it: netstat -tlnp | grep 25089${NC}"
else
    echo -e "${GREEN}   ✅ Port 25089 is available${NC}"
fi

echo ""

# Check if verusd is running and get connection count
if pgrep -f verusd > /dev/null; then
    echo -e "${BLUE}7. Current peer connections:${NC}"
    if command -v verus-cli &> /dev/null; then
        CONN_COUNT=$(verus-cli getconnectioncount 2>/dev/null || echo "0")
        echo -e "   Current connections: $CONN_COUNT"
        
        if [ "$CONN_COUNT" -gt 5 ]; then
            echo -e "${GREEN}   ✅ Excellent! You have more than 5 peers${NC}"
        elif [ "$CONN_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}   ⚠️  You have $CONN_COUNT peers (should be > 5)${NC}"
        else
            echo -e "${RED}   ❌ No connections yet${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  verus-cli not found${NC}"
    fi
else
    echo -e "${BLUE}7. Peer connections:${NC}"
    echo -e "${YELLOW}   ⚠️  Daemon not running - cannot check connections${NC}"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                              Summary                                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"

# Overall assessment
ISSUES=0

if ! command -v verusd &> /dev/null; then
    echo -e "${RED}❌ verusd not installed${NC}"
    ((ISSUES++))
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file missing${NC}"
    ((ISSUES++))
fi

if [ -f "$CONFIG_FILE" ]; then
    if ! grep -q "^listen=1" "$CONFIG_FILE"; then
        echo -e "${RED}❌ listen=1 not configured${NC}"
        ((ISSUES++))
    fi
    
    if ! grep -q "^port=25089" "$CONFIG_FILE"; then
        echo -e "${RED}❌ port=25089 not configured${NC}"
        ((ISSUES++))
    fi
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 Setup looks good! You should get more than 5 peers.${NC}"
    echo ""
    echo -e "${BLUE}💡 To start the daemon:${NC}"
    echo -e "   verusd -daemon -conf=$CONFIG_FILE"
    echo ""
    echo -e "${BLUE}💡 To monitor connections:${NC}"
    echo -e "   verus-cli getconnectioncount"
else
    echo -e "${YELLOW}⚠️  Found $ISSUES issue(s) that need to be fixed.${NC}"
    echo ""
    echo -e "${BLUE}💡 Run the setup script to fix issues:${NC}"
    echo -e "   ./setup-verus-peers.sh"
fi
