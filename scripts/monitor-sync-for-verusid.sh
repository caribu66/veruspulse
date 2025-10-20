#!/bin/bash
#
# Monitor Blockchain Sync Progress for VerusID Scanning
# 
# This script monitors when your node reaches block 1,520,000
# (when VerusID was activated) and alerts you to start scanning.
#

# Configuration
RPC_USER="${VERUS_RPC_USER:-verus}"
RPC_PASS="${VERUS_RPC_PASSWORD:-1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb}"
RPC_HOST="${VERUS_RPC_HOST:-http://127.0.0.1:18843}"
TARGET_BLOCK=1520000  # VerusID activation block
CHECK_INTERVAL=300    # Check every 5 minutes (300 seconds)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to get current block height
get_current_block() {
    curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","id":"monitor","method":"getblockchaininfo","params":[]}' \
        -H 'content-type: text/plain;' "$RPC_HOST" | \
        jq -r '.result.blocks // 0'
}

# Function to get verification progress
get_progress() {
    curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","id":"monitor","method":"getblockchaininfo","params":[]}' \
        -H 'content-type: text/plain;' "$RPC_HOST" | \
        jq -r '.result.verificationprogress // 0'
}

# Function to estimate time remaining
estimate_time() {
    local current=$1
    local target=$2
    local blocks_per_check=$3
    local check_interval=$4
    
    if [ "$blocks_per_check" -gt 0 ]; then
        local remaining_blocks=$((target - current))
        local checks_needed=$((remaining_blocks / blocks_per_check))
        local seconds=$((checks_needed * check_interval))
        
        local days=$((seconds / 86400))
        local hours=$(((seconds % 86400) / 3600))
        local minutes=$(((seconds % 3600) / 60))
        
        if [ $days -gt 0 ]; then
            echo "${days}d ${hours}h ${minutes}m"
        elif [ $hours -gt 0 ]; then
            echo "${hours}h ${minutes}m"
        else
            echo "${minutes}m"
        fi
    else
        echo "calculating..."
    fi
}

# Main monitoring loop
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🔍 Monitoring Verus Sync for VerusID Scanning       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Target: Block $TARGET_BLOCK (VerusID activation)${NC}"
echo -e "${YELLOW}Checking every $CHECK_INTERVAL seconds...${NC}"
echo ""

last_block=0
iteration=0

while true; do
    current_block=$(get_current_block)
    progress=$(get_progress)
    progress_pct=$(echo "$progress * 100" | bc -l | awk '{printf "%.2f", $1}')
    
    iteration=$((iteration + 1))
    
    # Calculate sync rate
    if [ $last_block -gt 0 ]; then
        blocks_per_check=$((current_block - last_block))
        blocks_per_hour=$((blocks_per_check * 3600 / CHECK_INTERVAL))
    else
        blocks_per_check=0
        blocks_per_hour=0
    fi
    
    last_block=$current_block
    
    # Calculate remaining
    remaining_blocks=$((TARGET_BLOCK - current_block))
    remaining_pct=$(echo "scale=2; $remaining_blocks * 100 / $TARGET_BLOCK" | bc)
    
    # Clear line and display progress
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ $current_block -ge $TARGET_BLOCK ]; then
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                   🎉 TARGET REACHED! 🎉                    ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}✅ Current Block: $current_block${NC}"
        echo -e "${GREEN}✅ Target Block:  $TARGET_BLOCK${NC}"
        echo -e "${GREEN}✅ Time Reached:  $timestamp${NC}"
        echo ""
        echo -e "${YELLOW}📋 Next Steps:${NC}"
        echo ""
        echo -e "   ${BLUE}1.${NC} Scan the gap before your existing data:"
        echo -e "      ${YELLOW}node scripts/scan-verusid-gap.js --start 1520000 --end 1990205${NC}"
        echo ""
        echo -e "   ${BLUE}2.${NC} Or run the comprehensive scan:"
        echo -e "      ${YELLOW}node scripts/scan-all-verusids-comprehensive.js${NC}"
        echo ""
        
        # Send desktop notification if available
        if command -v notify-send &> /dev/null; then
            notify-send "Verus Sync Complete" "Block $TARGET_BLOCK reached! Ready for VerusID scanning." -u critical
        fi
        
        exit 0
    fi
    
    # Display progress bar
    progress_bar_width=40
    filled=$((current_block * progress_bar_width / TARGET_BLOCK))
    bar=$(printf "%-${progress_bar_width}s" "$(printf '#%.0s' $(seq 1 $filled))")
    
    echo -ne "\r[$timestamp] Block: $current_block / $TARGET_BLOCK [${bar// /-}] ${progress_pct}%"
    
    if [ $blocks_per_hour -gt 0 ]; then
        eta=$(estimate_time $current_block $TARGET_BLOCK $blocks_per_check $CHECK_INTERVAL)
        echo -ne " | Speed: ${blocks_per_hour}/hr | ETA: $eta    "
    fi
    
    # Every 10 iterations, show detailed status
    if [ $((iteration % 10)) -eq 0 ]; then
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  Current:   ${YELLOW}$current_block${NC} / $TARGET_BLOCK"
        echo -e "  Progress:  ${YELLOW}${progress_pct}%${NC}"
        echo -e "  Remaining: ${YELLOW}$remaining_blocks${NC} blocks"
        echo -e "  Speed:     ${YELLOW}$blocks_per_hour${NC} blocks/hour"
        if [ $blocks_per_hour -gt 0 ]; then
            eta=$(estimate_time $current_block $TARGET_BLOCK $blocks_per_check $CHECK_INTERVAL)
            echo -e "  ETA:       ${YELLOW}~$eta${NC}"
        fi
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    fi
    
    sleep $CHECK_INTERVAL
done

