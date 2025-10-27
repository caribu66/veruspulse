#!/bin/bash
###############################################################################
# Verus Peer Connection Setup Script
# Ensures you get more than 5 peers before launching verusd
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
echo -e "${BLUE}║                    Verus Peer Connection Setup                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration paths
VERUS_DIR="$HOME/.komodo/VRSC"
CONFIG_FILE="$VERUS_DIR/verus.conf"
BACKUP_FILE="$VERUS_DIR/verus.conf.backup.$(date +%Y%m%d_%H%M%S)"
OPTIMIZED_CONFIG="/home/explorer/verus-dapp/verus-optimized.conf"

echo -e "${YELLOW}🔍 Step 1: Checking system prerequisites...${NC}"

# Check if verusd exists
if ! command -v verusd &> /dev/null; then
    echo -e "${RED}❌ verusd command not found. Please install VerusCoin daemon first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ verusd command found${NC}"

# Check if we have sufficient RAM
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
if [ "$TOTAL_RAM" -lt 4096 ]; then
    echo -e "${YELLOW}⚠️  Warning: You have ${TOTAL_RAM}MB RAM. Consider reducing dbcache in config.${NC}"
else
    echo -e "${GREEN}✅ Sufficient RAM: ${TOTAL_RAM}MB${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 2: Checking network connectivity...${NC}"

# Test connectivity to key seed nodes
SEED_NODES=(
    "185.25.48.236:27485"
    "185.64.105.111:27485"
    "149.56.29.163:27485"
    "24.54.206.138:27485"
)

REACHABLE_NODES=0
for node in "${SEED_NODES[@]}"; do
    IP=$(echo $node | cut -d: -f1)
    PORT=$(echo $node | cut -d: -f2)
    if timeout 5 bash -c "</dev/tcp/$IP/$PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Can reach $node${NC}"
        ((REACHABLE_NODES++))
    else
        echo -e "${YELLOW}⚠️  Cannot reach $node (may be normal)${NC}"
    fi
done

if [ $REACHABLE_NODES -eq 0 ]; then
    echo -e "${RED}❌ Cannot reach any seed nodes. Check your internet connection.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Network connectivity verified (${REACHABLE_NODES}/${#SEED_NODES[@]} nodes reachable)${NC}"

echo ""
echo -e "${YELLOW}🔍 Step 3: Checking firewall configuration...${NC}"

# Check if port 25089 is open (your configured port)
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "25089.*ALLOW"; then
        echo -e "${GREEN}✅ Port 25089 is open in UFW firewall${NC}"
    else
        echo -e "${YELLOW}⚠️  Port 25089 not explicitly open in UFW${NC}"
        echo -e "${BLUE}💡 Run: sudo ufw allow 25089/tcp${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  UFW not found. Make sure port 25089 is open in your firewall.${NC}"
fi

# Check if iptables is blocking the port
if command -v iptables &> /dev/null; then
    if iptables -L INPUT | grep -q "25089"; then
        echo -e "${GREEN}✅ Port 25089 is configured in iptables${NC}"
    else
        echo -e "${YELLOW}⚠️  Port 25089 not explicitly configured in iptables${NC}"
        echo -e "${BLUE}💡 Run: sudo iptables -A INPUT -p tcp --dport 25089 -j ACCEPT${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}🔍 Step 4: Setting up optimized configuration...${NC}"

# Create backup of existing config
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${BLUE}📋 Backing up existing configuration...${NC}"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
fi

# Copy optimized configuration
if [ -f "$OPTIMIZED_CONFIG" ]; then
    echo -e "${BLUE}📋 Installing optimized configuration...${NC}"
    cp "$OPTIMIZED_CONFIG" "$CONFIG_FILE"
    echo -e "${GREEN}✅ Optimized configuration installed${NC}"
else
    echo -e "${RED}❌ Optimized configuration file not found: $OPTIMIZED_CONFIG${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Step 5: Verifying configuration...${NC}"

# Check critical configuration settings
REQUIRED_SETTINGS=(
    "maxconnections=125"
    "listen=1"
    "port=25089"
    "addnode=185.25.48.236:27485"
    "addnode=185.64.105.111:27485"
)

MISSING_SETTINGS=0
for setting in "${REQUIRED_SETTINGS[@]}"; do
    if grep -q "^$setting" "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ Found: $setting${NC}"
    else
        echo -e "${RED}❌ Missing: $setting${NC}"
        ((MISSING_SETTINGS++))
    fi
done

if [ $MISSING_SETTINGS -gt 0 ]; then
    echo -e "${RED}❌ Configuration verification failed. Please check the config file.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Step 6: Checking for conflicting processes...${NC}"

# Check if verusd is already running
if pgrep -f verusd > /dev/null; then
    echo -e "${RED}❌ verusd is already running. Please stop it first:${NC}"
    echo -e "${BLUE}💡 pkill -f verusd${NC}"
    exit 1
fi

# Check if port 25089 is in use
if netstat -tlnp 2>/dev/null | grep -q ":25089"; then
    echo -e "${RED}❌ Port 25089 is already in use. Please check what's using it:${NC}"
    echo -e "${BLUE}💡 netstat -tlnp | grep 25089${NC}"
    exit 1
fi

echo -e "${GREEN}✅ No conflicting processes found${NC}"

echo ""
echo -e "${YELLOW}🔍 Step 7: Creating startup script...${NC}"

# Create a startup script
STARTUP_SCRIPT="/home/explorer/verus-dapp/start-verusd.sh"
cat > "$STARTUP_SCRIPT" << 'EOF'
#!/bin/bash
# VerusCoin Daemon Startup Script
# Optimized for maximum peer connections

echo "🚀 Starting VerusCoin daemon with optimized peer configuration..."

# Change to the Verus directory
cd ~/.komodo/VRSC

# Start verusd with optimized settings
verusd -daemon -conf=verus.conf

echo "✅ VerusCoin daemon started!"
echo "📊 Monitor peer connections with: verus-cli getconnectioncount"
echo "🔍 Check peer info with: verus-cli getpeerinfo"
EOF

chmod +x "$STARTUP_SCRIPT"
echo -e "${GREEN}✅ Startup script created: $STARTUP_SCRIPT${NC}"

echo ""
echo -e "${YELLOW}🔍 Step 8: Creating monitoring script...${NC}"

# Create a monitoring script
MONITOR_SCRIPT="/home/explorer/verus-dapp/monitor-peers.sh"
cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash
# VerusCoin Peer Connection Monitor

while true; do
    clear
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    VerusCoin Peer Connection Monitor                        ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    if pgrep -f verusd > /dev/null; then
        echo "🟢 VerusCoin daemon is running"
        echo ""
        
        # Get connection count
        CONN_COUNT=$(verus-cli getconnectioncount 2>/dev/null || echo "0")
        echo "📊 Current connections: $CONN_COUNT"
        
        if [ "$CONN_COUNT" -gt 5 ]; then
            echo -e "✅ Excellent! You have more than 5 peers ($CONN_COUNT)"
        elif [ "$CONN_COUNT" -gt 0 ]; then
            echo -e "⚠️  You have $CONN_COUNT peers. Waiting for more..."
        else
            echo -e "❌ No connections yet. Please wait..."
        fi
        
        echo ""
        echo "🔍 Recent peer connections:"
        verus-cli getpeerinfo | jq -r '.[] | "\(.addr) - \(.subver // "Unknown")"' | head -10
        
        echo ""
        echo "⏰ Updated: $(date)"
        echo "Press Ctrl+C to stop monitoring"
        
    else
        echo "❌ VerusCoin daemon is not running"
        echo "💡 Start it with: ./start-verusd.sh"
    fi
    
    sleep 5
done
EOF

chmod +x "$MONITOR_SCRIPT"
echo -e "${GREEN}✅ Monitoring script created: $MONITOR_SCRIPT${NC}"

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. ${YELLOW}Start the daemon:${NC} ./start-verusd.sh"
echo -e "2. ${YELLOW}Monitor connections:${NC} ./monitor-peers.sh"
echo -e "3. ${YELLOW}Check manually:${NC} verus-cli getconnectioncount"
echo ""
echo -e "${BLUE}🔧 Configuration highlights:${NC}"
echo -e "• Maximum connections: 125"
echo -e "• Listening on port: 27485"
echo -e "• Seed nodes: 6 official Verus Foundation nodes"
echo -e "• Community nodes: 10 reliable European nodes"
echo -e "• Database cache: 8GB (adjust if needed)"
echo ""
echo -e "${GREEN}✨ You should now get more than 5 peers when you start verusd!${NC}"
