#!/bin/bash
###############################################################################
# setup-auto-stats-recalc.sh
# Sets up automatic statistics recalculation service
# 
# This script installs and configures the auto-recalculation service
# that keeps VerusID statistics up-to-date automatically.
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="verus-stats-recalc"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${BLUE}🚀 Setting up VerusPulse Statistics Auto-Recalculation Service${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   echo "Please run as the 'explorer' user instead"
   exit 1
fi

# Check if we're in the right directory
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: Not in the correct project directory${NC}"
    echo "Please run this script from the verus-dapp project root"
    exit 1
fi

# Make the auto-recalculation script executable
echo -e "${YELLOW}📝 Making scripts executable...${NC}"
chmod +x "$SCRIPT_DIR/auto-recalculate-stats.js"
chmod +x "$SCRIPT_DIR/recalculate-stats.sh"

# Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p "$PROJECT_DIR/logs"

# Copy service file to systemd directory
echo -e "${YELLOW}📋 Installing systemd service...${NC}"
sudo cp "$SCRIPT_DIR/verus-stats-recalc.service" "$SERVICE_FILE"

# Reload systemd to recognize the new service
echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Enable the service to start on boot
echo -e "${YELLOW}⚡ Enabling service to start on boot...${NC}"
sudo systemctl enable "$SERVICE_NAME"

# Start the service
echo -e "${YELLOW}🚀 Starting the service...${NC}"
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for the service to start
sleep 2

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service is running successfully!${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo "Checking service status:"
    sudo systemctl status "$SERVICE_NAME" --no-pager
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Auto-Recalculation Service Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Service Information:${NC}"
echo "  • Service Name: $SERVICE_NAME"
echo "  • Update Interval: Every 30 minutes"
echo "  • Log File: $PROJECT_DIR/logs/auto-stats-recalc.log"
echo "  • Lock File: $PROJECT_DIR/logs/stats-recalc.lock"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  • Check status:    sudo systemctl status $SERVICE_NAME"
echo "  • View logs:       sudo journalctl -u $SERVICE_NAME -f"
echo "  • Stop service:    sudo systemctl stop $SERVICE_NAME"
echo "  • Start service:   sudo systemctl start $SERVICE_NAME"
echo "  • Restart service: sudo systemctl restart $SERVICE_NAME"
echo "  • Disable service: sudo systemctl disable $SERVICE_NAME"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "  • View recent logs: tail -f $PROJECT_DIR/logs/auto-stats-recalc.log"
echo "  • Check if running: ps aux | grep auto-recalculate-stats"
echo ""
echo -e "${GREEN}✨ The service will now automatically recalculate VerusID statistics${NC}"
echo -e "${GREEN}   every 30 minutes to keep your data fresh and up-to-date!${NC}"
