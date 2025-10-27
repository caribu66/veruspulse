#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Initialize tracking variables
LAST_STAKE_COUNT=0
LAST_PANCHO_STAKES=0
LAST_VERUSID_COUNT=0
LAST_UPDATE_TIME=$(date +%s)

# Function to get current stats
get_current_stats() {
    # Get current stake count
    CURRENT_STAKE_COUNT=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT COUNT(*) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Get current VerusID count
    CURRENT_VERUSID_COUNT=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT COUNT(DISTINCT identity_address) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Get pancho77@ stakes
    CURRENT_PANCHO_STAKES=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT COUNT(*) FROM staking_rewards WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
    " | tr -d ' ')
    
    # Get pancho77@ VRSC total
    CURRENT_PANCHO_VRSC=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT ROUND(SUM(amount_sats)/100000000.0, 2) FROM staking_rewards WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
    " | tr -d ' ')
    
    # Get latest block
    LATEST_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT MAX(block_height) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Get earliest block
    EARLIEST_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT MIN(block_height) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    # Get recent stakes (last 5)
    RECENT_STAKES=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT 
        SUBSTRING(identity_address, 1, 12) || '... | Block: ' || block_height || ' | ' || ROUND(amount_sats/100000000.0, 2) || ' VRSC | ' || TO_CHAR(block_time, 'MM-DD HH24:MI')
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681
    ORDER BY block_height DESC 
    LIMIT 5;
    " | sed 's/^/    /')
}

# Function to calculate speed
calculate_speed() {
    local current_time=$(date +%s)
    local time_diff=$((current_time - LAST_UPDATE_TIME))
    
    if [ $time_diff -gt 0 ]; then
        local stake_diff=$((CURRENT_STAKE_COUNT - LAST_STAKE_COUNT))
        local pancho_diff=$((CURRENT_PANCHO_STAKES - LAST_PANCHO_STAKES))
        local verusid_diff=$((CURRENT_VERUSID_COUNT - LAST_VERUSID_COUNT))
        
        local stake_speed=$((stake_diff * 60 / time_diff))  # stakes per minute
        local pancho_speed=$((pancho_diff * 60 / time_diff))  # pancho stakes per minute
        
        echo "$stake_speed|$pancho_speed|$verusid_diff"
    else
        echo "0|0|0"
    fi
}

# Function to show progress
show_progress() {
    local total_blocks=1905488  # 3091681 - 1186194 + 1
    local processed_blocks=$((LATEST_BLOCK - 1186194 + 1))
    local progress_percent=$((processed_blocks * 100 / total_blocks))
    
    echo -e "${BLUE}Block Progress: [${NC}"
    local width=50
    local filled=$((progress_percent * width / 100))
    local empty=$((width - filled))
    
    printf "${GREEN}%*s${NC}" $filled | tr ' ' '█'
    printf "${WHITE}%*s${NC}" $empty | tr ' ' '░'
    echo -e "${BLUE}] ${progress_percent}%${NC}"
    echo -e "${CYAN}    Blocks: $processed_blocks / $total_blocks${NC}"
}

# Main monitoring loop
main() {
    while true; do
        clear
        echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║                    🔍 VERUS GAP-FILL SCANNER - DETAILED MONITOR              ║${NC}"
        echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        # Check if scanner is running
        SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
        if [ -z "$SCANNER_PID" ]; then
            echo -e "${RED}❌ Scanner is NOT running!${NC}"
            break
        else
            echo -e "${GREEN}✅ Scanner is running (PID: $SCANNER_PID)${NC}"
        fi
        
        # Get current stats
        get_current_stats
        
        # Calculate speed
        SPEED_DATA=$(calculate_speed)
        STAKE_SPEED=$(echo $SPEED_DATA | cut -d'|' -f1)
        PANCHO_SPEED=$(echo $SPEED_DATA | cut -d'|' -f2)
        VERUSID_DIFF=$(echo $SPEED_DATA | cut -d'|' -f3)
        
        # Show progress
        echo ""
        echo -e "${WHITE}📈 PROGRESS:${NC}"
        echo "============"
        show_progress
        echo ""
        
        # Show current stats
        echo -e "${WHITE}📊 CURRENT STATS:${NC}"
        echo "=================="
        echo -e "${CYAN}Total Stakes: $CURRENT_STAKE_COUNT${NC}"
        echo -e "${CYAN}Unique VerusIDs: $CURRENT_VERUSID_COUNT${NC}"
        echo -e "${PURPLE}pancho77@ Stakes: $CURRENT_PANCHO_STAKES${NC}"
        echo -e "${PURPLE}pancho77@ VRSC: $CURRENT_PANCHO_VRSC${NC}"
        echo -e "${YELLOW}Block Range: $EARLIEST_BLOCK → $LATEST_BLOCK${NC}"
        echo ""
        
        # Show speed
        echo -e "${WHITE}⚡ SPEED (per minute):${NC}"
        echo "====================="
        echo -e "${GREEN}Stakes Found: $STAKE_SPEED${NC}"
        echo -e "${PURPLE}pancho77@ Stakes: $PANCHO_SPEED${NC}"
        if [ $VERUSID_DIFF -gt 0 ]; then
            echo -e "${BLUE}New VerusIDs: +$VERUSID_DIFF${NC}"
        fi
        echo ""
        
        # Show recent stakes
        echo -e "${WHITE}🆕 RECENT STAKES:${NC}"
        echo "=================="
        echo "$RECENT_STAKES"
        echo ""
        
        # Show scanner process info
        echo -e "${WHITE}🔧 SCANNER INFO:${NC}"
        echo "=================="
        ps -p $SCANNER_PID -o pid,ppid,cmd,etime,pcpu,pmem --no-headers | while read line; do
            echo -e "${YELLOW}$line${NC}"
        done
        echo ""
        
        # Footer
        echo -e "${CYAN}⏰ Last updated: $(date '+%H:%M:%S') | Press Ctrl+C to exit${NC}"
        echo ""
        
        # Update tracking variables
        LAST_STAKE_COUNT=$CURRENT_STAKE_COUNT
        LAST_PANCHO_STAKES=$CURRENT_PANCHO_STAKES
        LAST_VERUSID_COUNT=$CURRENT_VERUSID_COUNT
        LAST_UPDATE_TIME=$(date +%s)
        
        # Wait 10 seconds before next update
        sleep 10
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}👋 Detailed monitoring stopped. Goodbye!${NC}"; exit 0' INT

# Start monitoring
main

