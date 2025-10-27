#!/bin/bash
###############################################################################
# setup-stats-automation.sh
# Interactive setup for VerusID statistics automation
# 
# This script provides an interactive menu to set up automatic
# statistics recalculation using different methods.
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to display header
show_header() {
    # Only clear if we're in an interactive terminal
    if [[ -t 1 ]]; then
        clear
    fi
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    VerusPulse Statistics Automation Setup                    ║${NC}"
    echo -e "${BLUE}║                                                                              ║${NC}"
    echo -e "${BLUE}║  Keep your VerusID statistics fresh and up-to-date automatically!           ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to display menu
show_menu() {
    echo -e "${CYAN}📋 Choose your automation method:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} ${YELLOW}Systemd Service${NC} (Recommended)"
    echo -e "   • Runs as a background service"
    echo -e "   • Automatic restart on failure"
    echo -e "   • Starts on system boot"
    echo -e "   • Better logging and monitoring"
    echo ""
    echo -e "${GREEN}2)${NC} ${YELLOW}Cron Job${NC} (Traditional)"
    echo -e "   • Uses system cron scheduler"
    echo -e "   • Simple and reliable"
    echo -e "   • Good for basic automation"
    echo ""
    echo -e "${GREEN}3)${NC} ${YELLOW}Manual Setup${NC}"
    echo -e "   • View setup instructions"
    echo -e "   • Customize your own automation"
    echo ""
    echo -e "${GREEN}4)${NC} ${YELLOW}Check Current Status${NC}"
    echo -e "   • View existing automation"
    echo -e "   • Check service status"
    echo ""
    echo -e "${GREEN}5)${NC} ${YELLOW}Remove Automation${NC}"
    echo -e "   • Stop and remove services"
    echo -e "   • Clean up cron jobs"
    echo ""
    echo -e "${GREEN}6)${NC} ${YELLOW}Test Statistics Recalculation${NC}"
    echo -e "   • Run recalculation manually"
    echo -e "   • Verify everything works"
    echo ""
    echo -e "${GREEN}0)${NC} ${YELLOW}Exit${NC}"
    echo ""
}

# Function to check current status
check_status() {
    echo -e "${BLUE}🔍 Checking current automation status...${NC}"
    echo ""
    
    # Check systemd service
    if systemctl list-units --full -all | grep -q "verus-stats-recalc.service"; then
        echo -e "${GREEN}✅ Systemd Service:${NC}"
        systemctl status verus-stats-recalc.service --no-pager -l
        echo ""
    else
        echo -e "${YELLOW}⚠️  Systemd Service: Not installed${NC}"
        echo ""
    fi
    
    # Check cron jobs
    if crontab -l 2>/dev/null | grep -q "cron-recalc-stats.sh"; then
        echo -e "${GREEN}✅ Cron Job:${NC}"
        echo "Found cron job:"
        crontab -l | grep "cron-recalc-stats.sh"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Cron Job: Not installed${NC}"
        echo ""
    fi
    
    # Check log files
    if [[ -f "$PROJECT_DIR/logs/auto-stats-recalc.log" ]]; then
        echo -e "${GREEN}📄 Systemd Log File:${NC} $PROJECT_DIR/logs/auto-stats-recalc.log"
        echo "Recent entries:"
        tail -5 "$PROJECT_DIR/logs/auto-stats-recalc.log" 2>/dev/null || echo "No recent entries"
        echo ""
    fi
    
    if [[ -f "$PROJECT_DIR/logs/cron-stats-recalc.log" ]]; then
        echo -e "${GREEN}📄 Cron Log File:${NC} $PROJECT_DIR/logs/cron-stats-recalc.log"
        echo "Recent entries:"
        tail -5 "$PROJECT_DIR/logs/cron-stats-recalc.log" 2>/dev/null || echo "No recent entries"
        echo ""
    fi
}

# Function to remove automation
remove_automation() {
    echo -e "${YELLOW}🗑️  Removing existing automation...${NC}"
    echo ""
    
    # Stop and remove systemd service
    if systemctl list-units --full -all | grep -q "verus-stats-recalc.service"; then
        echo -e "${YELLOW}Stopping systemd service...${NC}"
        sudo systemctl stop verus-stats-recalc.service 2>/dev/null || true
        sudo systemctl disable verus-stats-recalc.service 2>/dev/null || true
        sudo rm -f /etc/systemd/system/verus-stats-recalc.service
        sudo systemctl daemon-reload
        echo -e "${GREEN}✅ Systemd service removed${NC}"
    fi
    
    # Remove cron job
    if crontab -l 2>/dev/null | grep -q "cron-recalc-stats.sh"; then
        echo -e "${YELLOW}Removing cron job...${NC}"
        (crontab -l 2>/dev/null | grep -v "cron-recalc-stats.sh" || true) | crontab -
        echo -e "${GREEN}✅ Cron job removed${NC}"
    fi
    
    # Clean up lock files
    rm -f "$PROJECT_DIR/logs/stats-recalc.lock"
    rm -f "$PROJECT_DIR/logs/cron-stats-recalc.lock"
    
    echo -e "${GREEN}✅ All automation removed successfully${NC}"
}

# Function to test recalculation
test_recalculation() {
    echo -e "${YELLOW}🧪 Testing statistics recalculation...${NC}"
    echo ""
    
    if [[ -f "$SCRIPT_DIR/recalculate-stats.sh" ]]; then
        echo "Running: ./scripts/recalculate-stats.sh"
        echo ""
        if ./scripts/recalculate-stats.sh; then
            echo ""
            echo -e "${GREEN}✅ Test completed successfully!${NC}"
        else
            echo ""
            echo -e "${RED}❌ Test failed. Check the output above for errors.${NC}"
        fi
    else
        echo -e "${RED}❌ Statistics recalculation script not found${NC}"
    fi
}

# Function to show manual setup instructions
show_manual_instructions() {
    echo -e "${BLUE}📖 Manual Setup Instructions${NC}"
    echo ""
    echo -e "${YELLOW}Option 1: Systemd Service${NC}"
    echo "1. Run: ./scripts/setup-auto-stats-recalc.sh"
    echo "2. The service will run every 30 minutes automatically"
    echo ""
    echo -e "${YELLOW}Option 2: Cron Job${NC}"
    echo "1. Run: ./scripts/setup-cron-stats-recalc.sh"
    echo "2. Add this line to your crontab:"
    echo "   */30 * * * * $SCRIPT_DIR/cron-recalc-stats.sh"
    echo ""
    echo -e "${YELLOW}Option 3: Custom Schedule${NC}"
    echo "1. Edit the UPDATE_INTERVAL in auto-recalculate-stats.js"
    echo "2. Or modify the cron schedule as needed"
    echo ""
    echo -e "${YELLOW}Manual Execution${NC}"
    echo "• Run statistics recalculation: ./scripts/recalculate-stats.sh"
    echo "• Check logs: tail -f logs/auto-stats-recalc.log"
    echo ""
}

# Main menu loop
main() {
    while true; do
        show_header
        show_menu
        
        read -p "Enter your choice [0-6]: " choice
        echo ""
        
        case $choice in
            1)
                echo -e "${YELLOW}Setting up Systemd Service...${NC}"
                if [[ -f "$SCRIPT_DIR/setup-auto-stats-recalc.sh" ]]; then
                    chmod +x "$SCRIPT_DIR/setup-auto-stats-recalc.sh"
                    "$SCRIPT_DIR/setup-auto-stats-recalc.sh"
                else
                    echo -e "${RED}❌ Setup script not found${NC}"
                fi
                ;;
            2)
                echo -e "${YELLOW}Setting up Cron Job...${NC}"
                if [[ -f "$SCRIPT_DIR/setup-cron-stats-recalc.sh" ]]; then
                    chmod +x "$SCRIPT_DIR/setup-cron-stats-recalc.sh"
                    "$SCRIPT_DIR/setup-cron-stats-recalc.sh"
                else
                    echo -e "${RED}❌ Setup script not found${NC}"
                fi
                ;;
            3)
                show_manual_instructions
                ;;
            4)
                check_status
                ;;
            5)
                remove_automation
                ;;
            6)
                test_recalculation
                ;;
            0)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option. Please try again.${NC}"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Check if we're in the right directory
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: Not in the correct project directory${NC}"
    echo "Please run this script from the verus-dapp project root"
    exit 1
fi

# Run main function
main
