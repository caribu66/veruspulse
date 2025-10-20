#!/bin/bash

# Script to increase Verus daemon network connections
# This fixes the config typo and adds seed nodes

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CONF_FILE="$HOME/.komodo/VRSC/verus.conf"
BACKUP_FILE="$HOME/.komodo/VRSC/verus.conf.backup.$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Increase Verus Daemon Network Connections             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if config exists
if [ ! -f "$CONF_FILE" ]; then
    echo -e "${RED}Error: Config file not found at $CONF_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Current connections:${NC}"
~/verus-cli/verus getconnectioncount 2>/dev/null || echo "Could not get connection count"
echo ""

# Backup current config
echo -e "${YELLOW}Backing up current config to:${NC}"
echo "$BACKUP_FILE"
cp "$CONF_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Stop daemon
echo -e "${YELLOW}Stopping Verus daemon...${NC}"
~/verus-cli/verus stop 2>/dev/null || true
echo "Waiting for shutdown..."
sleep 15

# Fix typo: maconnections → maxconnections
echo -e "${YELLOW}Fixing configuration typo (maconnections → maxconnections)...${NC}"
sed -i 's/maconnections=/maxconnections=/' "$CONF_FILE"
echo -e "${GREEN}✓ Fixed typo${NC}"
echo ""

# Increase maxconnections to 100
echo -e "${YELLOW}Increasing maxconnections to 100...${NC}"
sed -i 's/maxconnections=[0-9]*/maxconnections=100/' "$CONF_FILE"
echo -e "${GREEN}✓ Updated maxconnections${NC}"
echo ""

# Add network settings if not present
echo -e "${YELLOW}Adding network optimization settings...${NC}"
grep -q "^discover=" "$CONF_FILE" || echo "discover=1" >> "$CONF_FILE"
grep -q "^dnsseed=" "$CONF_FILE" || echo "dnsseed=1" >> "$CONF_FILE"
grep -q "^upnp=" "$CONF_FILE" || echo "upnp=1" >> "$CONF_FILE"
echo -e "${GREEN}✓ Added network settings${NC}"
echo ""

# Add seed nodes
echo -e "${YELLOW}Adding Verus seed nodes...${NC}"
if ! grep -q "addnode=185.25.48.236" "$CONF_FILE"; then
    cat >> "$CONF_FILE" << 'EOF'

# Seed Nodes for Better Connectivity (added by increase-verus-connections.sh)
addnode=185.25.48.236:27485
addnode=185.64.105.111:27485
addnode=185.25.48.72:27485
addnode=185.25.48.173:27485
addnode=185.64.105.110:27485
addnode=45.33.96.19:27485
addnode=139.162.217.44:27485
addnode=172.104.166.31:27485
addnode=139.162.158.252:27485
addnode=139.162.178.190:27485
EOF
    echo -e "${GREEN}✓ Added 10 seed nodes${NC}"
else
    echo -e "${GREEN}✓ Seed nodes already present${NC}"
fi
echo ""

# Restart daemon
echo -e "${YELLOW}Starting Verus daemon...${NC}"
~/verus-cli/verusd -daemon
echo -e "${GREEN}✓ Daemon started${NC}"
echo ""

echo -e "${YELLOW}Waiting for daemon to initialize (30 seconds)...${NC}"
sleep 30

# Check new connection count
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Configuration updated successfully!${NC}"
echo ""
echo -e "${YELLOW}New connection count:${NC}"
CONNECTIONS=$(~/verus-cli/verus getconnectioncount 2>/dev/null || echo "0")
echo "$CONNECTIONS"
echo ""

if [ "$CONNECTIONS" -gt 0 ]; then
    echo -e "${GREEN}✓ Connected to the network!${NC}"
else
    echo -e "${YELLOW}⚠ Still connecting... Check again in a few minutes.${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Wait 5-10 minutes for more peer connections"
echo "2. Check connections: ~/verus-cli/verus getconnectioncount"
echo "3. View peers: ~/verus-cli/verus getpeerinfo | jq '.[]  | {addr, version, subver}'"
echo ""
echo "For incoming connections (to reach 25-40 peers):"
echo "  - Forward port 27485 on your router"
echo "  - Allow port 27485 in firewall: sudo ufw allow 27485/tcp"
echo ""
echo -e "${GREEN}Expected: 10-15 connections within 5 min, 25-40 with port forwarding${NC}"
echo ""

