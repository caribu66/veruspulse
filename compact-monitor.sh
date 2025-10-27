#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Function to get stats
get_stats() {
    # Check if scanner is running
    SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
    if [ -z "$SCANNER_PID" ]; then
        echo -e "${RED}❌ Scanner DOWN${NC}"
        return
    fi
    
    # Get runtime
    RUNTIME=$(ps -p $SCANNER_PID -o etime --no-headers | tr -d ' ')
    
    # Get database stats
    DB_STATS=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT COUNT(*) || ' stakes | ' || COUNT(DISTINCT identity_address) || ' VerusIDs'
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Get pancho77@ stats
    PANCHO_STATS=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT COUNT(*) || ' stakes | ' || ROUND(SUM(amount_sats)/100000000.0, 1) || ' VRSC'
    FROM staking_rewards 
    WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
    " | tr -d ' ')
    
    # Get latest block
    LATEST_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT MAX(block_height) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Display
    echo -e "${GREEN}✅ Scanner UP${NC} | ${YELLOW}Runtime: $RUNTIME${NC} | ${BLUE}Status: SCANNING...${NC}"
    echo -e "${CYAN}📊 $DB_STATS${NC}"
    echo -e "${PURPLE}🎯 pancho77@: $PANCHO_STATS${NC}"
    echo -e "${WHITE}📍 Latest Block: $LATEST_BLOCK${NC}"
}

# Main loop
while true; do
    clear
    echo -e "${WHITE}🔍 VERUS GAP-FILL MONITOR${NC}"
    echo "=========================="
    echo ""
    get_stats
    echo ""
    echo -e "${YELLOW}⏰ $(date '+%H:%M:%S') | Press Ctrl+C to exit${NC}"
    sleep 3
done
