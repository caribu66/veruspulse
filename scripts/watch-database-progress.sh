#!/bin/bash
###############################################################################
# Watch Database Progress - NO DEV SERVER NEEDED
# Monitors staking scan by watching the database directly
###############################################################################

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get initial state
INITIAL_STAKES=$(PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -t -A -c "SELECT COUNT(*) FROM staking_rewards;" 2>/dev/null)
INITIAL_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -t -A -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null)
START_TIME=$(date +%s)

clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Staking Scan Monitor (Database Direct)                         ║${NC}"
echo -e "${BLUE}║            Updates every 3 seconds - Ctrl+C to exit                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Starting monitor...${NC}"
echo -e "Initial stakes: ${CYAN}$(printf "%'d" $INITIAL_STAKES)${NC}"
echo -e "Initial block: ${CYAN}$(printf "%'d" $INITIAL_BLOCK)${NC}"
echo ""
sleep 2

while true; do
    # Move cursor up
    tput cup 8 0
    
    # Get current state
    CURRENT_DATA=$(PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -t -A -c "
        SELECT COUNT(*), MAX(block_height) FROM staking_rewards;
    " 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Database connection error${NC}"
        sleep 3
        continue
    fi
    
    CURRENT_STAKES=$(echo "$CURRENT_DATA" | cut -d'|' -f1)
    CURRENT_BLOCK=$(echo "$CURRENT_DATA" | cut -d'|' -f2)
    CURRENT_TIME=$(date +%s)
    
    # Calculate changes
    STAKES_ADDED=$((CURRENT_STAKES - INITIAL_STAKES))
    BLOCKS_ADDED=$((CURRENT_BLOCK - INITIAL_BLOCK))
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Calculate rates
    if [ $ELAPSED -gt 0 ]; then
        STAKES_PER_SEC=$(echo "scale=2; $STAKES_ADDED / $ELAPSED" | bc 2>/dev/null || echo "0")
        BLOCKS_PER_SEC=$(echo "scale=2; $BLOCKS_ADDED / $ELAPSED" | bc 2>/dev/null || echo "0")
    else
        STAKES_PER_SEC="0"
        BLOCKS_PER_SEC="0"
    fi
    
    # Format elapsed time
    HOURS=$((ELAPSED / 3600))
    MINS=$(((ELAPSED % 3600) / 60))
    SECS=$((ELAPSED % 60))
    
    # Display
    echo -e "${GREEN}🔄 SCANNING IN PROGRESS${NC}                                                    "
    echo ""
    echo -e "${CYAN}▶ Current Status:${NC}                                                    "
    echo -e "  Total Stakes: ${GREEN}$(printf "%'d" $CURRENT_STAKES)${NC} (+$(printf "%'d" $STAKES_ADDED))                                                    "
    echo -e "  Current Block: ${CYAN}$(printf "%'d" $CURRENT_BLOCK)${NC}                                                    "
    echo ""
    echo -e "${YELLOW}▶ Progress (since monitor started):${NC}                                                    "
    echo -e "  Blocks Scanned: ${CYAN}$(printf "%'d" $BLOCKS_ADDED)${NC}                                                    "
    echo -e "  Stakes Added: ${GREEN}$(printf "%'d" $STAKES_ADDED)${NC}                                                    "
    echo ""
    echo -e "${YELLOW}▶ Performance:${NC}                                                    "
    echo -e "  Speed: ${CYAN}${BLOCKS_PER_SEC}${NC} blocks/sec                                                    "
    echo -e "  Rate: ${GREEN}${STAKES_PER_SEC}${NC} stakes/sec                                                    "
    echo ""
    echo -e "${YELLOW}▶ Time:${NC}                                                    "
    echo -e "  Elapsed: ${CYAN}${HOURS}h ${MINS}m ${SECS}s${NC}                                                    "
    echo -e "  Updated: ${CYAN}$(date +"%H:%M:%S")${NC}                                                    "
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    sleep 3
done

