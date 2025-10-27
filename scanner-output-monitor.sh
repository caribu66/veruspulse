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

# Function to show scanner output
show_scanner_output() {
    # Check if scanner is running
    SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
    if [ -z "$SCANNER_PID" ]; then
        echo -e "${RED}❌ Scanner is NOT running!${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Scanner is running (PID: $SCANNER_PID)${NC}"
    
    # Try to get output from the process
    echo -e "${YELLOW}📊 Scanner Process Info:${NC}"
    ps -p $SCANNER_PID -o pid,ppid,cmd,etime,pcpu,pmem --no-headers | while read line; do
        echo -e "${CYAN}$line${NC}"
    done
    
    echo ""
    echo -e "${YELLOW}📈 Database Progress (Live):${NC}"
    echo "=========================="
    
    # Show current database stats
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
    SELECT 
        'Total Stakes: ' || COUNT(*) || ' | VerusIDs: ' || COUNT(DISTINCT identity_address) || ' | Range: ' || MIN(block_height) || '-' || MAX(block_height) as stats
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tail -n +3 | head -n -2 | sed 's/^/    /'
    
    echo ""
    echo -e "${YELLOW}🎯 pancho77@ Progress:${NC}"
    echo "====================="
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
    SELECT 
        'Stakes: ' || COUNT(*) || ' | VRSC: ' || ROUND(SUM(amount_sats)/100000000.0, 2) || ' | Range: ' || MIN(block_height) || '-' || MAX(block_height) as stats
    FROM staking_rewards 
    WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
    " | tail -n +3 | head -n -2 | sed 's/^/    /'
    
    echo ""
    echo -e "${YELLOW}🆕 Recent Stakes (Last 10):${NC}"
    echo "============================="
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
    SELECT 
        SUBSTRING(identity_address, 1, 12) || '... | Block: ' || block_height || ' | ' || ROUND(amount_sats/100000000.0, 2) || ' VRSC | ' || TO_CHAR(block_time, 'MM-DD HH24:MI') as recent_stakes
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681
    ORDER BY block_height DESC 
    LIMIT 10;
    " | tail -n +3 | head -n -2 | sed 's/^/    /'
}

# Function to monitor with speed calculation
monitor_with_speed() {
    local last_stake_count=0
    local last_pancho_stakes=0
    local last_update_time=$(date +%s)
    
    while true; do
        clear
        echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║                    🔍 VERUS GAP-FILL SCANNER - LIVE MONITOR                ║${NC}"
        echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        # Get current stats
        local current_stake_count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
        SELECT COUNT(*) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
        " | tr -d ' ')
        
        local current_pancho_stakes=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
        SELECT COUNT(*) FROM staking_rewards WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
        " | tr -d ' ')
        
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_update_time))
        
        # Calculate speed
        local stake_diff=$((current_stake_count - last_stake_count))
        local pancho_diff=$((current_pancho_stakes - last_pancho_stakes))
        
        local stake_speed=0
        local pancho_speed=0
        
        if [ $time_diff -gt 0 ]; then
            stake_speed=$((stake_diff * 60 / time_diff))  # stakes per minute
            pancho_speed=$((pancho_diff * 60 / time_diff))  # pancho stakes per minute
        fi
        
        # Show scanner status
        show_scanner_output
        
        echo ""
        echo -e "${WHITE}⚡ SPEED ANALYSIS:${NC}"
        echo "=================="
        echo -e "${GREEN}Stakes Found: $stake_speed per minute${NC}"
        echo -e "${PURPLE}pancho77@ Stakes: $pancho_speed per minute${NC}"
        echo -e "${YELLOW}Time Since Last Update: ${time_diff}s${NC}"
        echo ""
        
        # Show changes
        if [ $stake_diff -gt 0 ]; then
            echo -e "${GREEN}🆕 New Stakes Found: +$stake_diff${NC}"
        fi
        if [ $pancho_diff -gt 0 ]; then
            echo -e "${PURPLE}🎯 New pancho77@ Stakes: +$pancho_diff${NC}"
        fi
        
        echo ""
        echo -e "${CYAN}⏰ Last updated: $(date '+%H:%M:%S') | Press Ctrl+C to exit${NC}"
        echo ""
        
        # Update tracking variables
        last_stake_count=$current_stake_count
        last_pancho_stakes=$current_pancho_stakes
        last_update_time=$current_time
        
        # Wait 15 seconds before next update
        sleep 15
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}👋 Live monitoring stopped. Goodbye!${NC}"; exit 0' INT

# Start monitoring
monitor_with_speed

