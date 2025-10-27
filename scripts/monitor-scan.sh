#!/bin/bash
###############################################################################
# Real-time Monitor for Optimized Staking Scan
# Shows live progress with detailed statistics
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Clear screen
clear

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Optimized Staking Scan Monitor                             ║${NC}"
echo -e "${BLUE}║                     Press Ctrl+C to exit                                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to format numbers with commas
format_number() {
    printf "%'d" "$1" 2>/dev/null || echo "$1"
}

# Function to format time remaining
format_time() {
    local seconds=$1
    if [ $seconds -lt 60 ]; then
        echo "${seconds}s"
    elif [ $seconds -lt 3600 ]; then
        echo "$((seconds / 60))m $((seconds % 60))s"
    elif [ $seconds -lt 86400 ]; then
        echo "$((seconds / 3600))h $(((seconds % 3600) / 60))m"
    else
        echo "$((seconds / 86400))d $((seconds % 86400 / 3600))h"
    fi
}

# Function to draw progress bar
draw_progress_bar() {
    local percent=$1
    # Convert to integer and handle floating point
    local percent_int=$(echo "$percent" | cut -d. -f1)
    # Handle empty or invalid values
    if [ -z "$percent_int" ] || [ "$percent_int" = "null" ]; then
        percent_int=0
    fi
    local width=50
    local filled=$((percent_int * width / 100))
    local empty=$((width - filled))
    
    printf "["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' ' '
    printf "] %3s%%" "$percent"
}

# Monitor loop
while true; do
    # Get scan status
    RESPONSE=$(curl -s http://localhost:3000/api/admin/mass-scan 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Could not connect to API${NC}"
        echo -e "${YELLOW}Make sure Next.js server is running: npm run dev${NC}"
        sleep 5
        continue
    fi
    
    IS_RUNNING=$(echo "$RESPONSE" | jq -r '.isRunning')
    
    # Clear screen for update
    tput cup 5 0
    
    if [ "$IS_RUNNING" = "true" ]; then
        # Extract progress data
        PHASE=$(echo "$RESPONSE" | jq -r '.progress.currentPhase')
        BLOCKS_PROCESSED=$(echo "$RESPONSE" | jq -r '.progress.blocksProcessed')
        TOTAL_BLOCKS=$(echo "$RESPONSE" | jq -r '.progress.totalBlocks')
        STAKES_FOUND=$(echo "$RESPONSE" | jq -r '.progress.stakeEventsFound')
        ADDRESSES_TOTAL=$(echo "$RESPONSE" | jq -r '.progress.totalAddresses')
        BLOCK_PERCENT=$(echo "$RESPONSE" | jq -r '.progress.percentages.blocks')
        BLOCKS_PER_SEC=$(echo "$RESPONSE" | jq -r '.progress.rates.blocksPerSecond')
        STAKES_PER_SEC=$(echo "$RESPONSE" | jq -r '.progress.rates.stakesPerSecond')
        ELAPSED=$(echo "$RESPONSE" | jq -r '.progress.elapsedTime')
        ETA=$(echo "$RESPONSE" | jq -r '.progress.estimatedCompletion')
        ERRORS=$(echo "$RESPONSE" | jq -r '.progress.errors')
        CACHE_HITS=$(echo "$RESPONSE" | jq -r '.progress.cacheHits')
        CACHE_MISSES=$(echo "$RESPONSE" | jq -r '.progress.cacheMisses')
        
        # Calculate cache efficiency
        TOTAL_CACHE=$((CACHE_HITS + CACHE_MISSES))
        if [ $TOTAL_CACHE -gt 0 ]; then
            CACHE_EFFICIENCY=$((CACHE_HITS * 100 / TOTAL_CACHE))
        else
            CACHE_EFFICIENCY=0
        fi
        
        # Calculate remaining time
        if [ "$BLOCKS_PROCESSED" != "0" ] && [ "$BLOCKS_PROCESSED" != "null" ] && [ "$TOTAL_BLOCKS" != "0" ] && [ "$TOTAL_BLOCKS" != "null" ]; then
            BLOCKS_REMAINING=$((TOTAL_BLOCKS - BLOCKS_PROCESSED))
            if [ "$BLOCKS_PER_SEC" != "0.00" ] && [ "$BLOCKS_PER_SEC" != "0" ] && [ "$BLOCKS_PER_SEC" != "null" ]; then
                # Use bc for floating point calculation, or fallback to simple estimate
                SECONDS_REMAINING=$(echo "scale=0; $BLOCKS_REMAINING / $BLOCKS_PER_SEC" | bc 2>/dev/null || echo "0")
            else
                SECONDS_REMAINING=0
            fi
        else
            SECONDS_REMAINING=0
        fi
        
        # Display status
        echo -e "${GREEN}🔄 SCAN IN PROGRESS${NC}"
        echo ""
        echo -e "${CYAN}Phase:${NC} $PHASE"
        echo ""
        
        # Block progress
        echo -e "${YELLOW}▶ Block Progress:${NC}"
        printf "  "
        draw_progress_bar "$BLOCK_PERCENT"
        echo ""
        echo -e "  Processed: $(format_number $BLOCKS_PROCESSED) / $(format_number $TOTAL_BLOCKS)"
        echo ""
        
        # Performance metrics
        echo -e "${YELLOW}▶ Performance:${NC}"
        echo -e "  Speed: ${CYAN}${BLOCKS_PER_SEC}${NC} blocks/sec"
        echo -e "  Stakes Found: ${GREEN}$(format_number $STAKES_FOUND)${NC} (${STAKES_PER_SEC}/sec)"
        echo -e "  Errors: ${RED}$(format_number $ERRORS)${NC}"
        echo ""
        
        # Cache efficiency
        echo -e "${YELLOW}▶ Cache Efficiency:${NC}"
        echo -e "  Efficiency: ${CYAN}${CACHE_EFFICIENCY}%${NC}"
        echo -e "  Hits: $(format_number $CACHE_HITS) | Misses: $(format_number $CACHE_MISSES)"
        echo ""
        
        # Time tracking
        echo -e "${YELLOW}▶ Time Tracking:${NC}"
        echo -e "  Elapsed: ${CYAN}${ELAPSED}${NC}"
        if [ "$SECONDS_REMAINING" != "0" ]; then
            echo -e "  Remaining: ${CYAN}$(format_time $SECONDS_REMAINING)${NC}"
            if [ -n "$ETA" ] && [ "$ETA" != "null" ]; then
                ETA_FORMATTED=$(date -d "$ETA" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)
                if [ -n "$ETA_FORMATTED" ]; then
                    echo -e "  ETA: ${CYAN}${ETA_FORMATTED}${NC}"
                fi
            fi
        fi
        echo ""
        
        # VerusIDs
        if [ "$ADDRESSES_TOTAL" != "0" ] && [ "$ADDRESSES_TOTAL" != "null" ]; then
            echo -e "${YELLOW}▶ VerusIDs:${NC}"
            echo -e "  Tracking: ${CYAN}$(format_number $ADDRESSES_TOTAL)${NC} unique identities"
            echo ""
        fi
        
        # Progress indicator
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${CYAN}Updating every 2 seconds...${NC} ${MAGENTA}(Ctrl+C to exit)${NC}"
        
    else
        echo -e "${YELLOW}⏸️  NO SCAN RUNNING${NC}"
        echo ""
        echo -e "Start a scan with:"
        echo -e "  ${CYAN}./scripts/continue-staking-scan-optimized.sh${NC}"
        echo -e "or"
        echo -e "  ${CYAN}./scripts/start-mass-scan.sh${NC}"
        echo ""
    fi
    
    # Wait before next update
    sleep 2
done
