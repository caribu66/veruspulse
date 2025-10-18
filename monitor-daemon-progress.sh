#!/bin/bash

# Verus Daemon Reindex Progress Monitor
# Shows real-time progress of blockchain reindexing

VERUS_CLI="/home/explorer/verus-cli/verus"
TARGET_BLOCKS=5500000  # Approximate current block height
UPDATE_INTERVAL=10     # Seconds between updates

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Store previous block for rate calculation
PREV_BLOCKS=0
PREV_TIME=$(date +%s)

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Verus Daemon Reindex Progress Monitor v1.0             ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Monitoring reindex progress... Press Ctrl+C to stop${NC}"
echo ""

while true; do
    # Get current info
    INFO=$($VERUS_CLI getinfo 2>&1)
    
    if echo "$INFO" | grep -q "error code: -28"; then
        # Still loading/reindexing
        ERROR_MSG=$(echo "$INFO" | grep "error message" | cut -d: -f2- | xargs)
        
        # Try to get block count from debug.log
        CURRENT_BLOCKS=$(tail -1 ~/.komodo/VRSC/debug.log 2>/dev/null | grep -oP 'height=\K[0-9]+' || echo "0")
        
        if [ "$CURRENT_BLOCKS" = "0" ]; then
            CURRENT_BLOCKS=$(tail -100 ~/.komodo/VRSC/debug.log 2>/dev/null | grep "UpdateTip" | tail -1 | grep -oP 'height=\K[0-9]+' || echo "0")
        fi
        
        CURRENT_TIME=$(date +%s)
        TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
        
        if [ "$CURRENT_BLOCKS" -gt 0 ] && [ "$PREV_BLOCKS" -gt 0 ] && [ "$TIME_DIFF" -gt 0 ]; then
            # Calculate progress
            BLOCKS_PROCESSED=$((CURRENT_BLOCKS - PREV_BLOCKS))
            BLOCKS_PER_SEC=$(echo "scale=2; $BLOCKS_PROCESSED / $TIME_DIFF" | bc)
            PROGRESS=$(echo "scale=4; ($CURRENT_BLOCKS / $TARGET_BLOCKS) * 100" | bc)
            
            # Calculate ETA
            BLOCKS_REMAINING=$((TARGET_BLOCKS - CURRENT_BLOCKS))
            if [ $(echo "$BLOCKS_PER_SEC > 0" | bc) -eq 1 ]; then
                SECONDS_REMAINING=$(echo "scale=0; $BLOCKS_REMAINING / $BLOCKS_PER_SEC" | bc)
                HOURS=$((SECONDS_REMAINING / 3600))
                MINUTES=$(((SECONDS_REMAINING % 3600) / 60))
                ETA="${HOURS}h ${MINUTES}m"
            else
                ETA="Calculating..."
            fi
            
            # Display progress
            clear
            echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${BOLD}${CYAN}║     Verus Daemon Reindex Progress Monitor v1.0             ║${NC}"
            echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${YELLOW}Status: ${ERROR_MSG}${NC}"
            echo ""
            echo -e "${BOLD}Current Progress:${NC}"
            echo -e "  ${GREEN}Block Height:${NC}      ${CURRENT_BLOCKS} / ${TARGET_BLOCKS}"
            echo -e "  ${GREEN}Progress:${NC}          ${PROGRESS}%"
            
            # Progress bar
            PROGRESS_INT=$(echo "$PROGRESS / 1" | bc)
            BAR_LENGTH=50
            FILLED=$((PROGRESS_INT * BAR_LENGTH / 100))
            EMPTY=$((BAR_LENGTH - FILLED))
            BAR=$(printf "%${FILLED}s" | tr ' ' '█')
            EMPTY_BAR=$(printf "%${EMPTY}s" | tr ' ' '░')
            echo -e "  ${CYAN}[${BAR}${EMPTY_BAR}]${NC}"
            echo ""
            echo -e "${BOLD}Performance:${NC}"
            echo -e "  ${BLUE}Blocks/Second:${NC}     ${BLOCKS_PER_SEC}"
            echo -e "  ${BLUE}Blocks in ${TIME_DIFF}s:${NC}      ${BLOCKS_PROCESSED}"
            echo ""
            echo -e "${BOLD}Estimated Time:${NC}"
            echo -e "  ${YELLOW}Blocks Remaining:${NC}  ${BLOCKS_REMAINING}"
            echo -e "  ${YELLOW}ETA:${NC}               ${ETA}"
            echo ""
            echo -e "${CYAN}Last updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
        else
            # First run or no data yet
            echo -e "${YELLOW}Gathering initial data...${NC}"
            echo -e "Current block: ${CURRENT_BLOCKS}"
        fi
        
        # Update previous values
        PREV_BLOCKS=$CURRENT_BLOCKS
        PREV_TIME=$CURRENT_TIME
        
    elif echo "$INFO" | grep -q "blocks"; then
        # Daemon is fully synced and operational!
        CURRENT_BLOCKS=$(echo "$INFO" | jq -r '.blocks' 2>/dev/null || echo "Unknown")
        LONGEST_CHAIN=$(echo "$INFO" | jq -r '.longestchain' 2>/dev/null || echo "Unknown")
        CONNECTIONS=$(echo "$INFO" | jq -r '.connections' 2>/dev/null || echo "Unknown")
        
        clear
        echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BOLD}${GREEN}║              DAEMON IS READY! ✓                            ║${NC}"
        echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}${BOLD}Reindex Complete!${NC}"
        echo ""
        echo -e "  ${GREEN}Current Block:${NC}     ${CURRENT_BLOCKS}"
        echo -e "  ${GREEN}Longest Chain:${NC}     ${LONGEST_CHAIN}"
        echo -e "  ${GREEN}Connections:${NC}       ${CONNECTIONS}"
        echo ""
        echo -e "${CYAN}The explorer should now be loading data successfully!${NC}"
        echo -e "${YELLOW}Visit: http://localhost:3000${NC}"
        echo ""
        break
    else
        echo -e "${RED}Unable to connect to daemon${NC}"
        echo "$INFO"
    fi
    
    sleep $UPDATE_INTERVAL
done


