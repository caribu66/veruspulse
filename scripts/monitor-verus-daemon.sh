#!/bin/bash

##############################################################################
# Verus Daemon Monitor
# Continuously monitors Verus daemon initialization and sync status
##############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# RPC credentials
RPC_USER="${VERUS_RPC_USER:-verus}"
RPC_PASSWORD="${VERUS_RPC_PASSWORD:-verus}"
RPC_HOST="${VERUS_RPC_HOST:-http://127.0.0.1:18843}"

# Update interval (seconds)
UPDATE_INTERVAL=2

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    clear
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║           Verus Daemon Monitor - Live Status                  ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${BOLD}${BLUE}━━━ $1 ━━━${NC}"
}

# Check if daemon process is running
check_process() {
    if pgrep -x "verusd" > /dev/null; then
        echo "1"
    else
        echo "0"
    fi
}

# Make RPC call
rpc_call() {
    local method="$1"
    local params="${2:-[]}"
    
    curl -s --user "$RPC_USER:$RPC_PASSWORD" \
         --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"monitor\",\"method\":\"$method\",\"params\":$params}" \
         -H 'content-type: application/json' \
         "$RPC_HOST" 2>/dev/null
}

# Get daemon status
get_daemon_status() {
    local response=$(rpc_call "getblockchaininfo")
    
    if echo "$response" | grep -q "Work queue depth exceeded"; then
        echo "QUEUE_FULL"
    elif echo "$response" | grep -q "Loading block index"; then
        echo "LOADING"
    elif echo "$response" | grep -q "Activating best chain"; then
        echo "ACTIVATING"
    elif echo "$response" | grep -q "Rescanning"; then
        echo "RESCANNING"
    elif echo "$response" | grep -q "Verifying blocks"; then
        echo "VERIFYING"
    elif echo "$response" | grep -q "error"; then
        local error_msg=$(echo "$response" | jq -r '.error.message' 2>/dev/null)
        echo "ERROR:$error_msg"
    elif echo "$response" | jq -e '.result' > /dev/null 2>&1; then
        echo "READY"
    else
        echo "UNKNOWN"
    fi
}

# Get blockchain info
get_blockchain_info() {
    rpc_call "getblockchaininfo" | jq -r '.result // empty'
}

# Get network info
get_network_info() {
    rpc_call "getnetworkinfo" | jq -r '.result // empty'
}

# Get mining info
get_mining_info() {
    rpc_call "getmininginfo" | jq -r '.result // empty'
}

# Format uptime
format_uptime() {
    local pid=$1
    if [ -z "$pid" ]; then
        echo "N/A"
        return
    fi
    
    local start_time=$(ps -p "$pid" -o lstart= 2>/dev/null)
    if [ -z "$start_time" ]; then
        echo "N/A"
        return
    fi
    
    local start_seconds=$(date -d "$start_time" +%s 2>/dev/null)
    local current_seconds=$(date +%s)
    local uptime_seconds=$((current_seconds - start_seconds))
    
    local days=$((uptime_seconds / 86400))
    local hours=$(((uptime_seconds % 86400) / 3600))
    local minutes=$(((uptime_seconds % 3600) / 60))
    
    if [ $days -gt 0 ]; then
        echo "${days}d ${hours}h ${minutes}m"
    elif [ $hours -gt 0 ]; then
        echo "${hours}h ${minutes}m"
    else
        echo "${minutes}m"
    fi
}

# Get RPC connection count
get_rpc_connections() {
    lsof -i :18843 2>/dev/null | grep -v COMMAND | wc -l
}

##############################################################################
# Display Functions
##############################################################################

display_process_status() {
    print_section "Process Status"
    
    local is_running=$(check_process)
    local pid=$(pgrep -x "verusd")
    
    if [ "$is_running" = "1" ]; then
        local uptime=$(format_uptime "$pid")
        local cpu=$(ps -p "$pid" -o %cpu= 2>/dev/null | xargs)
        local mem=$(ps -p "$pid" -o %mem= 2>/dev/null | xargs)
        
        echo -e "  Status:      ${GREEN}${BOLD}● RUNNING${NC}"
        echo -e "  PID:         ${CYAN}$pid${NC}"
        echo -e "  Uptime:      ${CYAN}$uptime${NC}"
        echo -e "  CPU Usage:   ${CYAN}${cpu}%${NC}"
        echo -e "  Memory:      ${CYAN}${mem}%${NC}"
    else
        echo -e "  Status:      ${RED}${BOLD}● STOPPED${NC}"
    fi
    echo ""
}

display_rpc_status() {
    print_section "RPC Status"
    
    local status=$(get_daemon_status)
    local rpc_connections=$(get_rpc_connections)
    
    case "$status" in
        "READY")
            echo -e "  Status:      ${GREEN}${BOLD}✓ READY${NC}"
            echo -e "  Description: ${GREEN}Daemon is fully initialized and accepting RPC calls${NC}"
            ;;
        "LOADING")
            echo -e "  Status:      ${YELLOW}${BOLD}⟳ LOADING${NC}"
            echo -e "  Description: ${YELLOW}Loading block index from disk...${NC}"
            ;;
        "ACTIVATING")
            echo -e "  Status:      ${YELLOW}${BOLD}⟳ ACTIVATING${NC}"
            echo -e "  Description: ${YELLOW}Activating best chain...${NC}"
            ;;
        "RESCANNING")
            echo -e "  Status:      ${YELLOW}${BOLD}⟳ RESCANNING${NC}"
            echo -e "  Description: ${YELLOW}Rescanning blockchain...${NC}"
            ;;
        "VERIFYING")
            echo -e "  Status:      ${YELLOW}${BOLD}⟳ VERIFYING${NC}"
            echo -e "  Description: ${YELLOW}Verifying blocks...${NC}"
            ;;
        "QUEUE_FULL")
            echo -e "  Status:      ${RED}${BOLD}⚠ QUEUE FULL${NC}"
            echo -e "  Description: ${RED}Work queue depth exceeded - too many concurrent requests${NC}"
            ;;
        ERROR:*)
            local error_msg="${status#ERROR:}"
            echo -e "  Status:      ${RED}${BOLD}✗ ERROR${NC}"
            echo -e "  Description: ${RED}$error_msg${NC}"
            ;;
        "UNKNOWN")
            echo -e "  Status:      ${MAGENTA}${BOLD}? UNKNOWN${NC}"
            echo -e "  Description: ${MAGENTA}Cannot determine daemon state${NC}"
            ;;
        *)
            echo -e "  Status:      ${MAGENTA}${BOLD}? $status${NC}"
            ;;
    esac
    
    echo -e "  RPC Host:    ${CYAN}$RPC_HOST${NC}"
    echo -e "  Connections: ${CYAN}$rpc_connections${NC}"
    echo ""
}

display_blockchain_status() {
    print_section "Blockchain Status"
    
    local bc_info=$(get_blockchain_info)
    
    if [ -n "$bc_info" ]; then
        local chain=$(echo "$bc_info" | jq -r '.chain // "unknown"')
        local blocks=$(echo "$bc_info" | jq -r '.blocks // 0')
        local headers=$(echo "$bc_info" | jq -r '.headers // 0')
        local bestblockhash=$(echo "$bc_info" | jq -r '.bestblockhash // "unknown"' | cut -c1-16)
        local difficulty=$(echo "$bc_info" | jq -r '.difficulty // 0')
        local verification=$(echo "$bc_info" | jq -r '.verificationprogress // 0')
        local chainwork=$(echo "$bc_info" | jq -r '.chainwork // "unknown"' | cut -c1-16)
        local size_on_disk=$(echo "$bc_info" | jq -r '.size_on_disk // 0')
        
        # Calculate sync percentage
        local sync_pct=0
        if [ "$headers" -gt 0 ] && [ "$blocks" -gt 0 ]; then
            sync_pct=$(awk "BEGIN {printf \"%.2f\", ($blocks/$headers)*100}")
        fi
        
        # Format size on disk
        local size_gb=$(awk "BEGIN {printf \"%.2f\", $size_on_disk/1073741824}")
        
        # Sync status indicator
        if [ "$blocks" = "$headers" ]; then
            echo -e "  Sync Status: ${GREEN}${BOLD}✓ SYNCED${NC}"
        else
            local behind=$((headers - blocks))
            echo -e "  Sync Status: ${YELLOW}${BOLD}⟳ SYNCING${NC} ${YELLOW}($behind blocks behind)${NC}"
        fi
        
        echo -e "  Chain:       ${CYAN}$chain${NC}"
        echo -e "  Blocks:      ${CYAN}$blocks${NC} / ${CYAN}$headers${NC} ${YELLOW}($sync_pct%)${NC}"
        echo -e "  Progress:    ${CYAN}$(awk "BEGIN {printf \"%.4f%%\", $verification*100}")${NC}"
        echo -e "  Best Block:  ${CYAN}$bestblockhash...${NC}"
        echo -e "  Difficulty:  ${CYAN}$(printf "%'.0f" $difficulty)${NC}"
        echo -e "  Chain Work:  ${CYAN}$chainwork...${NC}"
        echo -e "  Size:        ${CYAN}${size_gb} GB${NC}"
    else
        echo -e "  ${YELLOW}Waiting for blockchain data...${NC}"
    fi
    echo ""
}

display_network_status() {
    print_section "Network Status"
    
    local net_info=$(get_network_info)
    
    if [ -n "$net_info" ]; then
        local version=$(echo "$net_info" | jq -r '.version // 0')
        local subversion=$(echo "$net_info" | jq -r '.subversion // "unknown"')
        local protocol=$(echo "$net_info" | jq -r '.protocolversion // 0')
        local connections=$(echo "$net_info" | jq -r '.connections // 0')
        local timeoffset=$(echo "$net_info" | jq -r '.timeoffset // 0')
        
        echo -e "  Version:     ${CYAN}$version ($subversion)${NC}"
        echo -e "  Protocol:    ${CYAN}$protocol${NC}"
        echo -e "  Connections: ${CYAN}$connections${NC}"
        echo -e "  Time Offset: ${CYAN}${timeoffset}s${NC}"
    else
        echo -e "  ${YELLOW}Waiting for network data...${NC}"
    fi
    echo ""
}

display_mining_status() {
    print_section "Mining/Staking Status"
    
    local mining_info=$(get_mining_info)
    
    if [ -n "$mining_info" ]; then
        local blocks=$(echo "$mining_info" | jq -r '.blocks // 0')
        local difficulty=$(echo "$mining_info" | jq -r '.difficulty // 0')
        local networkhashps=$(echo "$mining_info" | jq -r '.networkhashps // 0')
        local pooledtx=$(echo "$mining_info" | jq -r '.pooledtx // 0')
        local chain=$(echo "$mining_info" | jq -r '.chain // "unknown"')
        
        # Format hash rate
        local hashrate_formatted
        if [ $(echo "$networkhashps > 1000000000000" | bc) -eq 1 ]; then
            hashrate_formatted="$(awk "BEGIN {printf \"%.2f\", $networkhashps/1000000000000}") TH/s"
        elif [ $(echo "$networkhashps > 1000000000" | bc) -eq 1 ]; then
            hashrate_formatted="$(awk "BEGIN {printf \"%.2f\", $networkhashps/1000000000}") GH/s"
        elif [ $(echo "$networkhashps > 1000000" | bc) -eq 1 ]; then
            hashrate_formatted="$(awk "BEGIN {printf \"%.2f\", $networkhashps/1000000}") MH/s"
        else
            hashrate_formatted="$(awk "BEGIN {printf \"%.2f\", $networkhashps/1000}") KH/s"
        fi
        
        echo -e "  Blocks:      ${CYAN}$blocks${NC}"
        echo -e "  Difficulty:  ${CYAN}$(printf "%'.0f" $difficulty)${NC}"
        echo -e "  Hashrate:    ${CYAN}$hashrate_formatted${NC}"
        echo -e "  Mempool:     ${CYAN}$pooledtx txs${NC}"
    else
        echo -e "  ${YELLOW}Waiting for mining data...${NC}"
    fi
    echo ""
}

display_footer() {
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${CYAN}Updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "  ${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""
}

##############################################################################
# Main Loop
##############################################################################

main() {
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed.${NC}"
        echo "Install with: sudo apt-get install jq"
        exit 1
    fi
    
    # Check if bc is installed
    if ! command -v bc &> /dev/null; then
        echo -e "${RED}Error: bc is required but not installed.${NC}"
        echo "Install with: sudo apt-get install bc"
        exit 1
    fi
    
    echo -e "${GREEN}Starting Verus Daemon Monitor...${NC}"
    sleep 1
    
    while true; do
        print_header
        display_process_status
        display_rpc_status
        display_blockchain_status
        display_network_status
        display_mining_status
        display_footer
        
        sleep $UPDATE_INTERVAL
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${CYAN}Monitor stopped.${NC}"; exit 0' INT

# Run main loop
main

