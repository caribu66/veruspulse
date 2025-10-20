#!/bin/bash
#
# 🚀 Verus Daemon Sync Monitor - Super Edition
#
# Monitors Verus blockchain sync with:
# - Real-time progress tracking
# - ETA calculations
# - Network statistics
# - Memory usage
# - Peer connections
# - Chain validation progress
# - Historical sync rate graphs
# - Desktop notifications at milestones
#

# Configuration
RPC_USER="${VERUS_RPC_USER:-verus}"
RPC_PASS="${VERUS_RPC_PASSWORD:-1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb}"
RPC_HOST="${VERUS_RPC_HOST:-http://127.0.0.1:18843}"
CHECK_INTERVAL="${SYNC_CHECK_INTERVAL:-10}"  # Check every 10 seconds
LOG_FILE="${HOME}/.verus-sync-monitor.log"

# VerusID activation milestone
VERUSID_BLOCK=1520000

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Unicode characters for better display
CHECK_MARK="✓"
CROSS_MARK="✗"
ARROW_RIGHT="→"
ARROW_UP="↑"
ARROW_DOWN="↓"
BLOCK_CHAR="█"
PROGRESS_CHAR="▓"
EMPTY_CHAR="░"

# Function to make RPC call
rpc_call() {
    local method=$1
    local params=${2:-[]}
    
    curl -s --connect-timeout 5 --max-time 10 \
        --user "$RPC_USER:$RPC_PASS" \
        --data-binary "{\"jsonrpc\":\"1.0\",\"id\":\"monitor\",\"method\":\"$method\",\"params\":$params}" \
        -H 'content-type: text/plain;' "$RPC_HOST" 2>/dev/null | \
        jq -r '.result // empty' 2>/dev/null
}

# Get blockchain info
get_blockchain_info() {
    rpc_call "getblockchaininfo"
}

# Get network info
get_network_info() {
    rpc_call "getnetworkinfo"
}

# Get peer info
get_peer_info() {
    rpc_call "getpeerinfo"
}

# Get mining info (includes current block)
get_mining_info() {
    rpc_call "getmininginfo"
}

# Get memory info
get_memory_info() {
    rpc_call "getmemoryinfo" '["stats"]'
}

# Format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ -z "$bytes" ] || [ "$bytes" = "null" ]; then
        echo "N/A"
        return
    fi
    
    if [ "$bytes" -lt 1024 ]; then
        echo "${bytes}B"
    elif [ "$bytes" -lt 1048576 ]; then
        echo "$(echo "scale=1; $bytes/1024" | bc)KB"
    elif [ "$bytes" -lt 1073741824 ]; then
        echo "$(echo "scale=1; $bytes/1048576" | bc)MB"
    else
        echo "$(echo "scale=2; $bytes/1073741824" | bc)GB"
    fi
}

# Format time duration
format_duration() {
    local seconds=$1
    
    if [ "$seconds" -lt 60 ]; then
        echo "${seconds}s"
    elif [ "$seconds" -lt 3600 ]; then
        local mins=$((seconds / 60))
        local secs=$((seconds % 60))
        echo "${mins}m ${secs}s"
    elif [ "$seconds" -lt 86400 ]; then
        local hours=$((seconds / 3600))
        local mins=$(((seconds % 3600) / 60))
        echo "${hours}h ${mins}m"
    else
        local days=$((seconds / 86400))
        local hours=$(((seconds % 86400) / 3600))
        echo "${days}d ${hours}h"
    fi
}

# Draw progress bar
draw_progress_bar() {
    local current=$1
    local total=$2
    local width=${3:-50}
    
    if [ "$total" -eq 0 ]; then
        echo "[$EMPTY_CHAR$EMPTY_CHAR$EMPTY_CHAR$EMPTY_CHAR$EMPTY_CHAR] 0%"
        return
    fi
    
    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="$PROGRESS_CHAR"; done
    for ((i=0; i<empty; i++)); do bar+="$EMPTY_CHAR"; done
    
    echo "[$bar] $percent%"
}

# Draw mini graph of sync rate history
draw_sync_graph() {
    local -n rates=$1
    local width=${2:-20}
    local height=${3:-5}
    
    if [ ${#rates[@]} -eq 0 ]; then
        echo "No data"
        return
    fi
    
    # Find max value
    local max=0
    for rate in "${rates[@]}"; do
        if [ "$rate" -gt "$max" ]; then
            max=$rate
        fi
    done
    
    if [ "$max" -eq 0 ]; then
        max=1
    fi
    
    # Draw graph
    local bars=("▁" "▂" "▃" "▄" "▅" "▆" "▇" "█")
    local graph=""
    
    for rate in "${rates[@]}"; do
        local normalized=$((rate * 7 / max))
        graph+="${bars[$normalized]}"
    done
    
    echo "$graph"
}

# Send desktop notification
send_notification() {
    local title=$1
    local message=$2
    local urgency=${3:-normal}
    
    if command -v notify-send &> /dev/null; then
        notify-send "$title" "$message" -u "$urgency" 2>/dev/null
    fi
}

# Log to file
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Initialize
clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🚀 VERUS DAEMON SYNC MONITOR - SUPER EDITION          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if daemon is running
echo -e "${YELLOW}Checking Verus daemon connection...${NC}"
BLOCKCHAIN_INFO=$(get_blockchain_info)

if [ -z "$BLOCKCHAIN_INFO" ]; then
    echo -e "${RED}${CROSS_MARK} Error: Cannot connect to Verus daemon${NC}"
    echo -e "${YELLOW}Make sure verusd is running and RPC credentials are correct${NC}"
    echo ""
    echo "RPC Host: $RPC_HOST"
    echo "RPC User: $RPC_USER"
    exit 1
fi

echo -e "${GREEN}${CHECK_MARK} Connected successfully!${NC}"
echo ""
sleep 1

# Arrays for history tracking
declare -a BLOCK_HISTORY=()
declare -a RATE_HISTORY=()
declare -a TIME_HISTORY=()
MAX_HISTORY=60

# Variables for tracking
LAST_BLOCK=0
LAST_TIME=$(date +%s)
START_TIME=$(date +%s)
MILESTONE_NOTIFIED=0

# Main monitoring loop
while true; do
    clear
    
    # Get all info
    BLOCKCHAIN_INFO=$(get_blockchain_info)
    NETWORK_INFO=$(get_network_info)
    MINING_INFO=$(get_mining_info)
    
    if [ -z "$BLOCKCHAIN_INFO" ]; then
        echo -e "${RED}${CROSS_MARK} Lost connection to daemon${NC}"
        sleep $CHECK_INTERVAL
        continue
    fi
    
    # Parse blockchain info
    CURRENT_BLOCK=$(echo "$BLOCKCHAIN_INFO" | jq -r '.blocks // 0')
    HEADERS=$(echo "$BLOCKCHAIN_INFO" | jq -r '.headers // 0')
    VERIFICATION_PROGRESS=$(echo "$BLOCKCHAIN_INFO" | jq -r '.verificationprogress // 0')
    PROGRESS_PCT=$(echo "$VERIFICATION_PROGRESS * 100" | bc -l | awk '{printf "%.2f", $1}')
    CHAIN=$(echo "$BLOCKCHAIN_INFO" | jq -r '.chain // "unknown"')
    DIFFICULTY=$(echo "$BLOCKCHAIN_INFO" | jq -r '.difficulty // 0')
    SIZE_ON_DISK=$(echo "$BLOCKCHAIN_INFO" | jq -r '.size_on_disk // 0')
    PRUNED=$(echo "$BLOCKCHAIN_INFO" | jq -r '.pruned // false')
    
    # Parse network info
    CONNECTIONS=$(echo "$NETWORK_INFO" | jq -r '.connections // 0')
    SUBVERSION=$(echo "$NETWORK_INFO" | jq -r '.subversion // "unknown"')
    PROTOCOL_VERSION=$(echo "$NETWORK_INFO" | jq -r '.protocolversion // 0')
    
    # Calculate sync rate
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_TIME))
    
    if [ "$LAST_BLOCK" -gt 0 ] && [ "$TIME_DIFF" -gt 0 ]; then
        BLOCKS_DIFF=$((CURRENT_BLOCK - LAST_BLOCK))
        BLOCKS_PER_SEC=$(echo "scale=2; $BLOCKS_DIFF / $TIME_DIFF" | bc)
        BLOCKS_PER_HOUR=$(echo "$BLOCKS_PER_SEC * 3600" | bc | awk '{printf "%.0f", $1}')
        
        # Add to history
        RATE_HISTORY+=($BLOCKS_PER_HOUR)
        if [ ${#RATE_HISTORY[@]} -gt $MAX_HISTORY ]; then
            RATE_HISTORY=("${RATE_HISTORY[@]:1}")
        fi
    else
        BLOCKS_PER_HOUR=0
    fi
    
    LAST_BLOCK=$CURRENT_BLOCK
    LAST_TIME=$CURRENT_TIME
    
    # Calculate ETA
    BLOCKS_REMAINING=$((HEADERS - CURRENT_BLOCK))
    if [ "$BLOCKS_PER_HOUR" -gt 0 ] && [ "$BLOCKS_REMAINING" -gt 0 ]; then
        ETA_HOURS=$(echo "scale=1; $BLOCKS_REMAINING / $BLOCKS_PER_HOUR" | bc)
        ETA_SECONDS=$(echo "$ETA_HOURS * 3600" | bc | awk '{printf "%.0f", $1}')
        ETA_FORMATTED=$(format_duration $ETA_SECONDS)
    else
        ETA_FORMATTED="Calculating..."
    fi
    
    # Calculate time elapsed
    ELAPSED=$((CURRENT_TIME - START_TIME))
    ELAPSED_FORMATTED=$(format_duration $ELAPSED)
    
    # Header
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       🚀 VERUS BLOCKCHAIN SYNC STATUS                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Sync Progress
    echo -e "${BOLD}${CYAN}📊 SYNC PROGRESS${NC}"
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Progress bar
    PROGRESS_BAR=$(draw_progress_bar $CURRENT_BLOCK $HEADERS 50)
    echo -e "  ${PROGRESS_BAR}"
    echo ""
    
    echo -e "  ${BOLD}Current Block:${NC}    ${GREEN}$CURRENT_BLOCK${NC} / $HEADERS"
    echo -e "  ${BOLD}Blocks Behind:${NC}    ${YELLOW}$BLOCKS_REMAINING${NC}"
    echo -e "  ${BOLD}Progress:${NC}         ${CYAN}${PROGRESS_PCT}%${NC}"
    echo -e "  ${BOLD}Chain:${NC}            ${MAGENTA}$CHAIN${NC}"
    echo ""
    
    # Sync Rate & ETA
    echo -e "${BOLD}${CYAN}⚡ SYNC RATE & ETA${NC}"
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}Current Rate:${NC}     ${GREEN}${BLOCKS_PER_HOUR}${NC} blocks/hour"
    echo -e "  ${BOLD}ETA:${NC}              ${YELLOW}$ETA_FORMATTED${NC}"
    echo -e "  ${BOLD}Time Elapsed:${NC}     ${BLUE}$ELAPSED_FORMATTED${NC}"
    
    if [ ${#RATE_HISTORY[@]} -gt 5 ]; then
        GRAPH=$(draw_sync_graph RATE_HISTORY)
        echo -e "  ${BOLD}Rate History:${NC}     ${CYAN}$GRAPH${NC}"
    fi
    echo ""
    
    # Milestones
    echo -e "${BOLD}${CYAN}🎯 MILESTONES${NC}"
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # VerusID milestone
    if [ "$CURRENT_BLOCK" -ge "$VERUSID_BLOCK" ]; then
        echo -e "  ${GREEN}${CHECK_MARK} VerusID Activated${NC} (Block $VERUSID_BLOCK) ${GREEN}REACHED!${NC}"
        if [ "$MILESTONE_NOTIFIED" -eq 0 ]; then
            send_notification "VerusID Milestone Reached!" "Block $VERUSID_BLOCK - Ready for VerusID scanning" "critical"
            log_message "VerusID milestone reached at block $CURRENT_BLOCK"
            MILESTONE_NOTIFIED=1
        fi
    else
        VERUSID_REMAINING=$((VERUSID_BLOCK - CURRENT_BLOCK))
        VERUSID_PCT=$(echo "scale=2; $CURRENT_BLOCK * 100 / $VERUSID_BLOCK" | bc)
        echo -e "  ${YELLOW}⏳ VerusID Activation${NC} (Block $VERUSID_BLOCK)"
        echo -e "     $ARROW_RIGHT ${VERUSID_REMAINING} blocks remaining (${VERUSID_PCT}%)"
    fi
    
    # 25%, 50%, 75% milestones
    if [ "${PROGRESS_PCT%.*}" -ge 25 ] && [ "${PROGRESS_PCT%.*}" -lt 50 ]; then
        echo -e "  ${GREEN}${CHECK_MARK} 25% Complete${NC}"
        echo -e "  ${YELLOW}⏳ 50% Milestone${NC}"
    elif [ "${PROGRESS_PCT%.*}" -ge 50 ] && [ "${PROGRESS_PCT%.*}" -lt 75 ]; then
        echo -e "  ${GREEN}${CHECK_MARK} 50% Complete${NC}"
        echo -e "  ${YELLOW}⏳ 75% Milestone${NC}"
    elif [ "${PROGRESS_PCT%.*}" -ge 75 ] && [ "${PROGRESS_PCT%.*}" -lt 100 ]; then
        echo -e "  ${GREEN}${CHECK_MARK} 75% Complete${NC}"
        echo -e "  ${YELLOW}⏳ 100% Milestone${NC}"
    elif [ "${PROGRESS_PCT%.*}" -ge 100 ]; then
        echo -e "  ${GREEN}${CHECK_MARK} 100% SYNCED!${NC}"
    fi
    echo ""
    
    # Network Status
    echo -e "${BOLD}${CYAN}🌐 NETWORK STATUS${NC}"
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}Connections:${NC}      ${GREEN}$CONNECTIONS${NC} peers"
    echo -e "  ${BOLD}Protocol:${NC}         v$PROTOCOL_VERSION"
    echo -e "  ${BOLD}Subversion:${NC}       $SUBVERSION"
    echo -e "  ${BOLD}Difficulty:${NC}       $(printf "%.2f" $DIFFICULTY)"
    echo ""
    
    # Storage
    echo -e "${BOLD}${CYAN}💾 STORAGE${NC}"
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    DISK_SIZE=$(format_bytes $SIZE_ON_DISK)
    echo -e "  ${BOLD}Blockchain Size:${NC}  ${YELLOW}$DISK_SIZE${NC}"
    echo -e "  ${BOLD}Pruning:${NC}          $([ "$PRUNED" = "true" ] && echo "${GREEN}Enabled${NC}" || echo "${BLUE}Disabled${NC}")"
    echo ""
    
    # Footer
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${DIM}Monitoring... (refresh every ${CHECK_INTERVAL}s)${NC}"
    echo -e "  ${DIM}Press Ctrl+C to stop${NC}"
    echo -e "  ${DIM}Log file: $LOG_FILE${NC}"
    echo ""
    
    # Check if fully synced
    if [ "$BLOCKS_REMAINING" -le 0 ]; then
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                 🎉 SYNC COMPLETE! 🎉                         ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}${CHECK_MARK} Blockchain is fully synced!${NC}"
        echo -e "${GREEN}${CHECK_MARK} Current block: $CURRENT_BLOCK${NC}"
        echo -e "${GREEN}${CHECK_MARK} Total time: $ELAPSED_FORMATTED${NC}"
        echo ""
        
        send_notification "Verus Sync Complete!" "Blockchain fully synced at block $CURRENT_BLOCK" "critical"
        log_message "Sync complete at block $CURRENT_BLOCK after $ELAPSED_FORMATTED"
        
        echo -e "${YELLOW}You can now run:${NC}"
        echo -e "  ${CYAN}node scripts/scan-verusid-gap.js --auto${NC}"
        echo ""
        exit 0
    fi
    
    sleep $CHECK_INTERVAL
done

