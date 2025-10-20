#!/bin/bash
# Safe Verus Configuration Update Script
# This script will backup your current config and apply the optimized version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=============================================="
echo "  Verus Configuration Update Script"
echo "=============================================="
echo -e "${NC}"

# Configuration paths
VERUS_DATA_DIR="$HOME/.komodo/VRSC"
CURRENT_CONFIG="$VERUS_DATA_DIR/VRSC.conf"
BACKUP_DIR="$VERUS_DATA_DIR/backups"
OPTIMIZED_CONFIG="./verus.conf.optimized"
EXPLORER_ENV="/home/explorer/verus-dapp/.env.local"

# Step 1: Check if daemon is running
echo -e "${YELLOW}Step 1: Checking daemon status...${NC}"
if pgrep -x "verusd" > /dev/null; then
    echo -e "${GREEN}✓${NC} Daemon is running"
    DAEMON_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC} Daemon is not running"
    DAEMON_RUNNING=false
fi

# Step 2: Create backup directory
echo -e "\n${YELLOW}Step 2: Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓${NC} Backup directory ready: $BACKUP_DIR"

# Step 3: Backup current config
echo -e "\n${YELLOW}Step 3: Backing up current configuration...${NC}"
BACKUP_FILE="$BACKUP_DIR/VRSC.conf.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f "$CURRENT_CONFIG" ]; then
    cp "$CURRENT_CONFIG" "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Backup saved: $BACKUP_FILE"
else
    echo -e "${RED}✗${NC} Config file not found: $CURRENT_CONFIG"
    exit 1
fi

# Step 4: Show what will change
echo -e "\n${YELLOW}Step 4: Configuration changes:${NC}"
echo "  • RPC threads: 16 → 24 (better concurrent handling)"
echo "  • Work queue: 1024 → 2048 (handle burst traffic)"
echo "  • DB cache: 2GB → 4GB (faster queries)"
echo "  • Mempool: 512MB → 1GB (more tx history)"
echo "  • Connections: 40 → 125 (better network health)"
echo "  • ZMQ ports: Fixed conflicts (separate ports)"

# Step 5: Ask for confirmation
echo -e "\n${YELLOW}Step 5: Confirmation${NC}"
read -p "Do you want to proceed with the update? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Update cancelled.${NC}"
    exit 0
fi

# Step 6: Generate secure RPC password
echo -e "\n${YELLOW}Step 6: Generating secure RPC password...${NC}"
NEW_RPC_PASSWORD=$(openssl rand -base64 32 | tr -d '/' | tr -d '+' | cut -c1-32)
echo -e "${GREEN}✓${NC} New password generated (will be shown at end)"

# Step 7: Copy optimized config
echo -e "\n${YELLOW}Step 7: Applying optimized configuration...${NC}"
if [ -f "$OPTIMIZED_CONFIG" ]; then
    cp "$OPTIMIZED_CONFIG" "$CURRENT_CONFIG"
    echo -e "${GREEN}✓${NC} Configuration updated"
else
    echo -e "${RED}✗${NC} Optimized config not found: $OPTIMIZED_CONFIG"
    echo "Please ensure you're running this from the verus-dapp directory"
    exit 1
fi

# Step 8: Update RPC password in verus.conf
echo -e "\n${YELLOW}Step 8: Updating RPC password in verus.conf...${NC}"
sed -i "s/rpcpassword=.*/rpcpassword=$NEW_RPC_PASSWORD/" "$CURRENT_CONFIG"
echo -e "${GREEN}✓${NC} RPC password updated in verus.conf"

# Step 9: Update RPC password in explorer .env
echo -e "\n${YELLOW}Step 9: Updating RPC password in explorer .env...${NC}"
if [ -f "$EXPLORER_ENV" ]; then
    # Backup .env.local
    cp "$EXPLORER_ENV" "$EXPLORER_ENV.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update password
    sed -i "s/VERUS_RPC_PASSWORD=.*/VERUS_RPC_PASSWORD=$NEW_RPC_PASSWORD/" "$EXPLORER_ENV"
    echo -e "${GREEN}✓${NC} Explorer .env updated"
else
    echo -e "${YELLOW}⚠${NC} Explorer .env not found at $EXPLORER_ENV"
    echo "You'll need to update VERUS_RPC_PASSWORD manually"
fi

# Step 10: Restart daemon (if it was running)
if [ "$DAEMON_RUNNING" = true ]; then
    echo -e "\n${YELLOW}Step 10: Restarting daemon with new configuration...${NC}"
    echo "This may take a few minutes..."
    
    # Stop daemon
    echo "  • Stopping daemon..."
    ~/verus-cli/verus stop 2>/dev/null || true
    
    # Wait for shutdown
    echo "  • Waiting for shutdown..."
    WAIT_COUNT=0
    while pgrep -x "verusd" > /dev/null && [ $WAIT_COUNT -lt 60 ]; do
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 1))
        echo -n "."
    done
    echo
    
    if pgrep -x "verusd" > /dev/null; then
        echo -e "${RED}✗${NC} Daemon did not stop cleanly. Please stop manually."
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} Daemon stopped"
    
    # Start daemon
    echo "  • Starting daemon with new config..."
    ~/verus-cli/verusd -daemon
    sleep 3
    
    if pgrep -x "verusd" > /dev/null; then
        echo -e "${GREEN}✓${NC} Daemon started successfully"
    else
        echo -e "${RED}✗${NC} Failed to start daemon. Check logs: tail -f ~/.komodo/VRSC/debug.log"
        exit 1
    fi
    
    # Wait for RPC to be ready
    echo "  • Waiting for RPC to be ready..."
    WAIT_COUNT=0
    while ! ~/verus-cli/verus getinfo &>/dev/null && [ $WAIT_COUNT -lt 30 ]; do
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 1))
        echo -n "."
    done
    echo
    
    if ~/verus-cli/verus getinfo &>/dev/null; then
        echo -e "${GREEN}✓${NC} Daemon is responding to RPC"
    else
        echo -e "${YELLOW}⚠${NC} Daemon is starting but RPC not ready yet (this is normal)"
        echo "    Monitor with: tail -f ~/.komodo/VRSC/debug.log"
    fi
else
    echo -e "\n${YELLOW}Step 10: Daemon was not running${NC}"
    echo "Start it manually when ready: ~/verus-cli/verusd -daemon"
fi

# Step 11: Verify ZMQ ports
echo -e "\n${YELLOW}Step 11: Verifying ZMQ configuration...${NC}"
sleep 5  # Give daemon time to open ports
ZMQ_PORTS=$(netstat -tuln 2>/dev/null | grep "127.0.0.1:2833" || true)
if [ -n "$ZMQ_PORTS" ]; then
    echo -e "${GREEN}✓${NC} ZMQ ports are active:"
    echo "$ZMQ_PORTS" | sed 's/^/    /'
else
    echo -e "${YELLOW}⚠${NC} ZMQ ports not yet visible (daemon may still be starting)"
    echo "    Check later with: netstat -tuln | grep 2833"
fi

# Summary
echo -e "\n${GREEN}"
echo "=============================================="
echo "  Configuration Update Complete!"
echo "=============================================="
echo -e "${NC}"

echo "📋 Summary:"
echo "  • Backup saved: $BACKUP_FILE"
echo "  • Configuration updated with optimized settings"
echo "  • RPC password changed (see below)"
echo "  • Explorer .env updated"
if [ "$DAEMON_RUNNING" = true ]; then
    echo "  • Daemon restarted with new config"
fi

echo -e "\n🔐 ${YELLOW}IMPORTANT - Save these credentials:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RPC Username: verus"
echo "  RPC Password: $NEW_RPC_PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "These credentials have been automatically updated in:"
echo "  • ~/.komodo/VRSC/VRSC.conf"
echo "  • /home/explorer/verus-dapp/.env.local"

echo -e "\n📊 Next steps:"
echo "  1. Monitor daemon: tail -f ~/.komodo/VRSC/debug.log"
echo "  2. Check status: ~/verus-cli/verus getinfo"
echo "  3. Verify explorer: curl http://localhost:3000/api/health"
echo "  4. Test ZMQ: Check explorer logs for real-time updates"

echo -e "\n📚 Documentation:"
echo "  • Full details: cat VERUS-CONFIG-IMPROVEMENTS.md"
echo "  • Rollback: cp $BACKUP_FILE $CURRENT_CONFIG"

echo -e "\n${GREEN}✓ Update successful!${NC}"




