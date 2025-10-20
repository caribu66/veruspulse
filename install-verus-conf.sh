#!/bin/bash
#
# Install Optimized Verus Configuration
# This script backs up your existing config and installs the new one
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CONF_DIR="$HOME/.komodo/VRSC"
CONF_FILE="$CONF_DIR/verus.conf"
BACKUP_FILE="$CONF_DIR/verus.conf.backup.$(date +%Y%m%d_%H%M%S)"
NEW_CONF="verus.conf.custom"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Installing Optimized Verus Configuration              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if new config exists
if [ ! -f "$NEW_CONF" ]; then
    echo -e "${RED}Error: $NEW_CONF not found!${NC}"
    echo "Please run this script from the verus-dapp directory."
    exit 1
fi

# Create config directory if it doesn't exist
if [ ! -d "$CONF_DIR" ]; then
    echo -e "${YELLOW}Creating config directory: $CONF_DIR${NC}"
    mkdir -p "$CONF_DIR"
fi

# Backup existing config
if [ -f "$CONF_FILE" ]; then
    echo -e "${YELLOW}Backing up existing config to:${NC}"
    echo "  $BACKUP_FILE"
    cp "$CONF_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created${NC}"
    echo ""
fi

# Install new config
echo -e "${YELLOW}Installing new configuration...${NC}"
cp "$NEW_CONF" "$CONF_FILE"
echo -e "${GREEN}✓ Configuration installed${NC}"
echo ""

# Show what to do next
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Next Steps                                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1. Open firewall port:${NC}"
echo -e "   ${GREEN}sudo ufw allow 27485/tcp${NC}"
echo ""
echo -e "${YELLOW}2. If behind router, forward port 27485${NC}"
echo ""
echo -e "${YELLOW}3. Restart Verus daemon:${NC}"
echo -e "   ${GREEN}verus stop${NC}"
echo -e "   ${GREEN}sleep 10${NC}"
echo -e "   ${GREEN}verusd &${NC}"
echo ""
echo -e "${YELLOW}4. Monitor sync (after 5 minutes):${NC}"
echo -e "   ${GREEN}./scripts/monitor-verus-sync.sh${NC}"
echo ""
echo -e "${YELLOW}5. Check connections:${NC}"
echo -e "   ${GREEN}verus getconnectioncount${NC}"
echo -e "   ${BLUE}(Expected: 50-125 connections)${NC}"
echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""

