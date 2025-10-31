#!/bin/bash

# ============================================
# Cleanup Script for Cursor Exit
# ============================================
# This script ensures all project-related processes
# are stopped when you close Cursor to prevent
# RAM consumption from lingering processes
# ============================================

echo "🧹 Cleaning up verus-dapp processes..."

# Base directory
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CLEANED=0

# Function to kill processes by pattern
kill_by_pattern() {
    local pattern="$1"
    local display_name="$2"

    # Get PIDs matching the pattern, but exclude this script and grep itself
    PIDS=$(pgrep -f "$pattern" | grep -v "^$$\$")

    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}Stopping $display_name...${NC}"
        echo "$PIDS" | while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -TERM "$pid" 2>/dev/null
                sleep 0.5
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null
                fi
            fi
        done
        echo -e "${GREEN}  ✓ Stopped${NC}"
        CLEANED=$((CLEANED + 1))
    fi
}

# Stop Next.js development server ONLY (not PM2-managed production)
kill_by_pattern "next dev" "Next.js Dev Server"

# Kill zombie jest-worker processes that consume memory
echo -e "${YELLOW}Checking for zombie jest-worker processes...${NC}"
ZOMBIE_COUNT=$(ps aux | grep -E 'jest-worker/processChild' | grep -v grep | wc -l)
if [ "$ZOMBIE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  Found $ZOMBIE_COUNT zombie worker(s), killing them...${NC}"
    pkill -9 -f "jest-worker/processChild" 2>/dev/null || true
    echo -e "${GREEN}  ✓ Zombie workers killed${NC}"
    CLEANED=$((CLEANED + 1))
else
    echo -e "${GREEN}  ✓ No zombie workers found${NC}"
fi

# DO NOT stop PM2-managed production server!
# The production server is managed by PM2 and should stay running
# If you need to stop production: pm2 stop veruspulse

# Stop npm processes in this project directory
if pgrep -f "npm.*${BASE_DIR}" > /dev/null; then
    echo -e "${YELLOW}Stopping npm processes...${NC}"
    pkill -TERM -f "npm.*${BASE_DIR}" 2>/dev/null
    sleep 1
    if pgrep -f "npm.*${BASE_DIR}" > /dev/null; then
        pkill -9 -f "npm.*${BASE_DIR}" 2>/dev/null
    fi
    echo -e "${GREEN}  ✓ Stopped npm processes${NC}"
    CLEANED=$((CLEANED + 1))
fi

# Stop any node processes running in this directory
NODE_PIDS=$(lsof -t "$BASE_DIR" 2>/dev/null | grep -v "^$$\$")
if [ -n "$NODE_PIDS" ]; then
    echo -e "${YELLOW}Stopping node processes with open files in project...${NC}"
    echo "$NODE_PIDS" | while read -r pid; do
        if ps -p "$pid" -o comm= | grep -q node; then
            kill -TERM "$pid" 2>/dev/null
            sleep 0.5
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
        fi
    done
    echo -e "${GREEN}  ✓ Stopped${NC}"
    CLEANED=$((CLEANED + 1))
fi

# Stop monitoring scripts
kill_by_pattern "monitor-remote-daemon.js" "Daemon Monitor"
kill_by_pattern "monitor-new-stakes.js" "Stake Monitor"
kill_by_pattern "scan-all-verusids" "VerusID Scanner"
kill_by_pattern "auto-update-utxos.js" "UTXO Auto-Updater"

# Clean up lock files
echo -e "${YELLOW}Removing lock files...${NC}"
rm -f "$BASE_DIR"/.*.lock
echo -e "${GREEN}  ✓ Lock files removed${NC}"

# Final check
echo ""
echo "═══════════════════════════════════════"
if [ $CLEANED -gt 0 ]; then
    echo -e "${GREEN}✅ Cleaned up $CLEANED process type(s)${NC}"
else
    echo -e "${GREEN}✅ No processes to clean up${NC}"
fi

# Show remaining processes (if any)
REMAINING=$(ps aux | grep -E "next dev|next start|npm.*verus-dapp" | grep -v grep | grep -v cleanup-on-cursor-exit)
if [ -n "$REMAINING" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some processes may still be running:${NC}"
    echo "$REMAINING"
else
    echo -e "${GREEN}✓ All verus-dapp processes stopped${NC}"
fi

echo "═══════════════════════════════════════"
echo ""
echo "💡 Tip: Run this script when closing Cursor to ensure"
echo "   no processes are left consuming RAM."

