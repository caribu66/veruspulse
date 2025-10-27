#!/bin/bash
###############################################################################
# fix-stats-service.sh
# Fix the systemd service for statistics recalculation
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="verus-stats-recalc"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${BLUE}🔧 Fixing VerusPulse Statistics Service${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   echo "Please run as the 'explorer' user instead"
   exit 1
fi

# Stop the service if it's running
echo -e "${YELLOW}🛑 Stopping service...${NC}"
sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# Disable the service
echo -e "${YELLOW}🔌 Disabling service...${NC}"
sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true

# Remove the old service file
echo -e "${YELLOW}🗑️  Removing old service file...${NC}"
sudo rm -f "$SERVICE_FILE"

# Copy the simple service file
echo -e "${YELLOW}📋 Installing simplified service file...${NC}"
sudo cp "$SCRIPT_DIR/verus-stats-recalc-simple.service" "$SERVICE_FILE"

# Reload systemd
echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Enable the service
echo -e "${YELLOW}⚡ Enabling service...${NC}"
sudo systemctl enable "$SERVICE_NAME"

# Start the service
echo -e "${YELLOW}🚀 Starting service...${NC}"
sudo systemctl start "$SERVICE_NAME"

# Wait a moment
sleep 3

# Check status
echo -e "${YELLOW}📊 Checking service status...${NC}"
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service is now running successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Information:${NC}"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
    echo -e "${RED}❌ Service still not running${NC}"
    echo ""
    echo -e "${YELLOW}📋 Service Status:${NC}"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    echo ""
    echo -e "${YELLOW}📋 Recent Logs:${NC}"
    sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Service Fixed Successfully!${NC}"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  • Check status:    sudo systemctl status $SERVICE_NAME"
echo "  • View logs:       sudo journalctl -u $SERVICE_NAME -f"
echo "  • Stop service:    sudo systemctl stop $SERVICE_NAME"
echo "  • Start service:   sudo systemctl start $SERVICE_NAME"
echo "  • Restart service: sudo systemctl restart $SERVICE_NAME"
echo ""
echo -e "${GREEN}✨ The service will now automatically recalculate statistics every 30 minutes!${NC}"
