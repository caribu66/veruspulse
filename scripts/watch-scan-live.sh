#!/bin/bash
###############################################################################
# Live Scan Monitor - Works WITHOUT dev server
# Monitors scan progress by querying the API
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Clear screen and show header
clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Live Scan Monitor (Real-time)                            ║${NC}"
echo -e "${BLUE}║                  Updates every 2 seconds - Ctrl+C to exit                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/api/admin/mass-scan > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to http://localhost:3000${NC}"
    echo -e "${YELLOW}The Next.js server needs to be running.${NC}"
    echo ""
    echo -e "Start it with: ${CYAN}npm run dev${NC}"
    exit 1
fi

# Monitor loop
while true; do
    # Move cursor to line 6
    tput cup 5 0
    
    # Get status
    RESPONSE=$(curl -s http://localhost:3000/api/admin/mass-scan 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Connection lost${NC}"
        sleep 2
        continue
    fi
    
    IS_RUNNING=$(echo "$RESPONSE" | jq -r '.isRunning')
    
    if [ "$IS_RUNNING" = "true" ]; then
        # Extract data
        PHASE=$(echo "$RESPONSE" | jq -r '.progress.currentPhase')
        BLOCKS_DONE=$(echo "$RESPONSE" | jq -r '.progress.blocksProcessed')
        TOTAL_BLOCKS=$(echo "$RESPONSE" | jq -r '.progress.totalBlocks')
        PERCENT=$(echo "$RESPONSE" | jq -r '.progress.percentages.blocks')
        STAKES=$(echo "$RESPONSE" | jq -r '.progress.stakeEventsFound')
        SPEED=$(echo "$RESPONSE" | jq -r '.progress.rates.blocksPerSecond')
        STAKES_SEC=$(echo "$RESPONSE" | jq -r '.progress.rates.stakesPerSecond')
        ELAPSED=$(echo "$RESPONSE" | jq -r '.progress.elapsedTime')
        ERRORS=$(echo "$RESPONSE" | jq -r '.progress.errors')
        CACHE_HITS=$(echo "$RESPONSE" | jq -r '.progress.cacheHits')
        CACHE_MISSES=$(echo "$RESPONSE" | jq -r '.progress.cacheMisses')
        ETA=$(echo "$RESPONSE" | jq -r '.progress.estimatedCompletion')
        
        # Calculate cache efficiency
        TOTAL_CACHE=$((CACHE_HITS + CACHE_MISSES))
        if [ $TOTAL_CACHE -gt 0 ]; then
            CACHE_EFF=$((CACHE_HITS * 100 / TOTAL_CACHE))
        else
            CACHE_EFF=0
        fi
        
        # Format numbers
        BLOCKS_DONE_FMT=$(printf "%'d" $BLOCKS_DONE 2>/dev/null || echo $BLOCKS_DONE)
        TOTAL_BLOCKS_FMT=$(printf "%'d" $TOTAL_BLOCKS 2>/dev/null || echo $TOTAL_BLOCKS)
        STAKES_FMT=$(printf "%'d" $STAKES 2>/dev/null || echo $STAKES)
        ERRORS_FMT=$(printf "%'d" $ERRORS 2>/dev/null || echo $ERRORS)
        
        # Calculate error rate
        if [ $BLOCKS_DONE -gt 0 ]; then
            ERROR_RATE=$((ERRORS * 100 / BLOCKS_DONE))
        else
            ERROR_RATE=0
        fi
        
        # Determine error color
        if [ $ERROR_RATE -lt 5 ]; then
            ERROR_COLOR=$GREEN
        elif [ $ERROR_RATE -lt 20 ]; then
            ERROR_COLOR=$YELLOW
        else
            ERROR_COLOR=$RED
        fi
        
        # Get percent as integer for progress bar
        PERCENT_INT=$(echo "$PERCENT" | cut -d. -f1)
        if [ -z "$PERCENT_INT" ]; then
            PERCENT_INT=0
        fi
        
        # Draw progress bar
        BAR_WIDTH=50
        FILLED=$((PERCENT_INT * BAR_WIDTH / 100))
        EMPTY=$((BAR_WIDTH - FILLED))
        
        # Display
        echo -e "${GREEN}🔄 SCAN IN PROGRESS${NC}                                                          "
        echo ""
        echo -e "${CYAN}Phase:${NC} $PHASE                                                          "
        echo ""
        
        echo -e "${YELLOW}▶ Block Progress:${NC}                                                          "
        printf "  ["
        printf "%${FILLED}s" | tr ' ' '='
        printf "%${EMPTY}s" | tr ' ' '-'
        printf "] ${CYAN}%s%%${NC}\n" "$PERCENT"
        echo -e "  Blocks: ${CYAN}${BLOCKS_DONE_FMT}${NC} / ${TOTAL_BLOCKS_FMT}                                                          "
        echo ""
        
        echo -e "${YELLOW}▶ Performance:${NC}                                                          "
        echo -e "  Speed: ${CYAN}${SPEED}${NC} blocks/sec                                                          "
        echo -e "  Stakes Found: ${GREEN}${STAKES_FMT}${NC} (${STAKES_SEC}/sec)                                                          "
        echo -e "  Errors: ${ERROR_COLOR}${ERRORS_FMT}${NC} (${ERROR_COLOR}${ERROR_RATE}%${NC} error rate)                                                          "
        echo ""
        
        echo -e "${YELLOW}▶ Cache Efficiency:${NC}                                                          "
        echo -e "  Efficiency: ${CYAN}${CACHE_EFF}%${NC}                                                          "
        echo -e "  Hits: $(printf "%'d" $CACHE_HITS 2>/dev/null) | Misses: $(printf "%'d" $CACHE_MISSES 2>/dev/null)                                                          "
        echo ""
        
        echo -e "${YELLOW}▶ Time Tracking:${NC}                                                          "
        echo -e "  Elapsed: ${CYAN}${ELAPSED}${NC}                                                          "
        if [ "$ETA" != "null" ] && [ -n "$ETA" ]; then
            ETA_FORMATTED=$(date -d "$ETA" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$ETA")
            echo -e "  ETA: ${CYAN}${ETA_FORMATTED}${NC}                                                          "
        fi
        echo ""
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${CYAN}Updating every 2 seconds...${NC} ${MAGENTA}(Ctrl+C to exit)${NC}                                                          "
        
        # Warning for high error rate
        if [ $ERROR_RATE -gt 20 ]; then
            echo ""
            echo -e "${RED}⚠️  WARNING: High error rate detected!${NC}"
            echo -e "${YELLOW}Consider stopping and restarting with more conservative settings.${NC}"
        fi
        
    else
        echo -e "${YELLOW}⏸️  NO SCAN RUNNING${NC}                                                          "
        echo ""
        echo -e "Start a scan with:                                                          "
        echo -e "  ${CYAN}npm run staking:scan${NC}                                                          "
        echo ""
    fi
    
    sleep 2
done

