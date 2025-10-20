#!/bin/bash

# Check Status of All Verus DApp Services
# This script shows the status of all services

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Verus DApp Services Status                                ║"
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

# Function to check service status
check_service() {
    local lock_file="$1"
    local service_name="$2"
    local port="$3"
    
    if [ -f "$lock_file" ]; then
        # Try to parse JSON first (new format)
        PID=$(cat "$lock_file" 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d':' -f2)
        
        # Fallback to old format (just PID)
        if [ -z "$PID" ]; then
            PID=$(cat "$lock_file" 2>/dev/null)
        fi
        
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo -e "${GREEN}✓ $service_name${NC}"
            echo "  PID: $PID"
            if [ -n "$port" ]; then
                echo "  Port: $port"
            fi
            echo "  Lock: $lock_file"
            
            # Show uptime if possible
            START_TIME=$(ps -p "$PID" -o lstart= 2>/dev/null)
            if [ -n "$START_TIME" ]; then
                echo "  Started: $START_TIME"
            fi
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠ $service_name (stale lock)${NC}"
            echo "  Lock file exists but process not running"
            echo "  Run: rm $lock_file"
            echo ""
            return 1
        fi
    else
        echo -e "${RED}✗ $service_name${NC}"
        echo "  Not running"
        echo ""
        return 1
    fi
}

echo -e "${BLUE}Checking services from lock files...${NC}"
echo ""

RUNNING=0

# Check development server
if check_service "$BASE_DIR/.dev-server.lock" "Development Server" "3000"; then
    RUNNING=$((RUNNING + 1))
fi

# Check production server
if check_service "$BASE_DIR/.prod-server.lock" "Production Server" "3000"; then
    RUNNING=$((RUNNING + 1))
fi

# Check daemon monitor
if check_service "$BASE_DIR/.daemon-monitor.lock" "Daemon Monitor"; then
    RUNNING=$((RUNNING + 1))
fi

# Check stake monitor
if check_service "$BASE_DIR/.stake-monitor.lock" "Stake Monitor"; then
    RUNNING=$((RUNNING + 1))
fi

# Check VerusID sync
if check_service "$BASE_DIR/.verusid-sync.lock" "VerusID Sync"; then
    RUNNING=$((RUNNING + 1))
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""

# Additional check by process name
echo -e "${BLUE}Checking for processes by name...${NC}"
echo ""

check_by_name() {
    local pattern="$1"
    local name="$2"
    
    if pgrep -f "$pattern" > /dev/null; then
        PIDS=$(pgrep -f "$pattern")
        echo -e "${GREEN}✓ $name${NC}"
        for pid in $PIDS; do
            echo "  PID: $pid"
            START_TIME=$(ps -p "$pid" -o lstart= 2>/dev/null)
            if [ -n "$START_TIME" ]; then
                echo "  Started: $START_TIME"
            fi
        done
        echo ""
        return 0
    else
        return 1
    fi
}

if check_by_name "next dev" "Next.js Dev (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

if check_by_name "next start" "Next.js Prod (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

if check_by_name "monitor-remote-daemon.js" "Daemon Monitor (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

if check_by_name "monitor-new-stakes.js" "Stake Monitor (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

if check_by_name "scan-all-verusids" "VerusID Scanner (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

if check_by_name "auto-update-utxos.js" "UTXO Auto-Updater (by process)"; then
    RUNNING=$((RUNNING + 1))
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $RUNNING -gt 0 ]; then
    echo -e "${GREEN}📊 $RUNNING service(s) running${NC}"
else
    echo -e "${YELLOW}ℹ️  No services are running${NC}"
fi

echo ""
echo -e "${BLUE}💡 Useful commands:${NC}"
echo "  Start dev:    npm run dev"
echo "  Start prod:   npm run build && npm start"
echo "  Stop all:     ./scripts/stop-all-services.sh"
echo "  Status:       ./scripts/status-all-services.sh"
echo ""




