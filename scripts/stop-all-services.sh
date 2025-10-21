#!/bin/bash

# Stop All Verus DApp Services
# This script stops all running services and cleans up lock files

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Stopping All Verus DApp Services                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(dirname "$0")/.."

# Counter for stopped services
STOPPED=0
NOTHING_RUNNING=0

# Function to stop a service by lock file
stop_service() {
    local lock_file="$1"
    local service_name="$2"
    
    if [ -f "$lock_file" ]; then
        PID=$(cat "$lock_file" 2>/dev/null)
        if [ -n "$PID" ]; then
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "${BLUE}Stopping $service_name (PID: $PID)...${NC}"
                if kill -TERM "$PID" 2>/dev/null; then
                    # Wait a moment for graceful shutdown
                    sleep 1
                    # Check if still running
                    if kill -0 "$PID" 2>/dev/null; then
                        echo -e "${YELLOW}  Force stopping...${NC}"
                        kill -9 "$PID" 2>/dev/null
                    fi
                    echo -e "${GREEN}  ✓ Stopped${NC}"
                    STOPPED=$((STOPPED + 1))
                else
                    echo -e "${RED}  ✗ Failed to stop${NC}"
                fi
            else
                echo -e "${YELLOW}$service_name: Process not found (stale lock)${NC}"
            fi
            rm -f "$lock_file"
        fi
    else
        NOTHING_RUNNING=$((NOTHING_RUNNING + 1))
    fi
}

echo -e "${BLUE}Checking for running services...${NC}"
echo ""

# Stop development server
stop_service "$BASE_DIR/.dev-server.lock" "Development Server"

# Stop production server
stop_service "$BASE_DIR/.prod-server.lock" "Production Server"

# Stop daemon monitor
stop_service "$BASE_DIR/.daemon-monitor.lock" "Daemon Monitor"

# Stop stake monitor
stop_service "$BASE_DIR/.stake-monitor.lock" "Stake Monitor"

# Stop VerusID sync
stop_service "$BASE_DIR/.verusid-sync.lock" "VerusID Sync"

echo ""
echo "═══════════════════════════════════════════════════════════════"

# Additional cleanup using process names (fallback)
echo ""
echo -e "${BLUE}Checking for processes by name...${NC}"

# Function to kill by process name
kill_by_name() {
    local process_name="$1"
    local display_name="$2"
    
    if pgrep -f "$process_name" > /dev/null; then
        echo -e "${YELLOW}Found $display_name still running${NC}"
        pkill -TERM -f "$process_name" 2>/dev/null
        sleep 1
        if pgrep -f "$process_name" > /dev/null; then
            pkill -9 -f "$process_name" 2>/dev/null
        fi
        echo -e "${GREEN}  ✓ Stopped${NC}"
        STOPPED=$((STOPPED + 1))
    fi
}

kill_by_name "next dev" "Next.js Dev Server"
kill_by_name "next start" "Next.js Production Server"
kill_by_name "monitor-remote-daemon.js" "Daemon Monitor"
kill_by_name "monitor-new-stakes.js" "Stake Monitor"
kill_by_name "scan-all-verusids" "VerusID Scanner"
kill_by_name "auto-update-utxos.js" "UTXO Auto-Updater"

# Stop npm processes related to this project
if pgrep -f "npm.*verus-dapp" > /dev/null; then
    echo -e "${YELLOW}Found npm processes for verus-dapp${NC}"
    pkill -TERM -f "npm.*verus-dapp" 2>/dev/null
    sleep 1
    if pgrep -f "npm.*verus-dapp" > /dev/null; then
        pkill -9 -f "npm.*verus-dapp" 2>/dev/null
    fi
    echo -e "${GREEN}  ✓ Stopped npm processes${NC}"
    STOPPED=$((STOPPED + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $STOPPED -gt 0 ]; then
    echo -e "${GREEN}✅ Stopped $STOPPED service(s)${NC}"
else
    echo -e "${YELLOW}ℹ️  No services were running${NC}"
fi

echo ""
echo -e "${BLUE}📊 Final check:${NC}"
if pgrep -f "next dev\|next start\|monitor.*\.js\|scan-all-verusids" > /dev/null; then
    echo -e "${RED}⚠️  Some processes may still be running:${NC}"
    ps aux | grep -E "next dev|next start|monitor.*\.js|scan-all-verusids" | grep -v grep
else
    echo -e "${GREEN}✓ All services stopped${NC}"
fi

echo ""
echo -e "${BLUE}🧹 Cleaning up lock files...${NC}"
rm -f "$BASE_DIR"/.*.lock
echo -e "${GREEN}✓ Done${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════════"




