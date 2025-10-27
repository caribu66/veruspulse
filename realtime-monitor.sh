#!/bin/bash

# Colors for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to clear screen and show header
show_header() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    🔍 VERUS GAP-FILL SCANNER - REAL-TIME MONITOR              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to get scanner status
get_scanner_status() {
    SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
    if [ -z "$SCANNER_PID" ]; then
        echo -e "${RED}❌ Scanner is NOT running!${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Scanner is running (PID: $SCANNER_PID)${NC}"
        return 0
    fi
}

# Function to get process stats
get_process_stats() {
    SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
    if [ ! -z "$SCANNER_PID" ]; then
        ps -p $SCANNER_PID -o pid,ppid,cmd,etime,pcpu,pmem --no-headers
    fi
}

# Function to get database stats
get_database_stats() {
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT 
        'Total Stakes: ' || COUNT(*) || ' | VerusIDs: ' || COUNT(DISTINCT identity_address) || ' | Blocks: ' || MIN(block_height) || '-' || MAX(block_height)
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' '
}

# Function to get pancho77@ stats
get_pancho_stats() {
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT 
        'Stakes: ' || COUNT(*) || ' | VRSC: ' || ROUND(SUM(amount_sats)/100000000.0, 2) || ' | Range: ' || MIN(block_height) || '-' || MAX(block_height)
    FROM staking_rewards 
    WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
    " | tr -d ' '
}

# Function to get recent stakes
get_recent_stakes() {
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT 
        SUBSTRING(identity_address, 1, 12) || '... | Block: ' || block_height || ' | ' || ROUND(amount_sats/100000000.0, 2) || ' VRSC | ' || TO_CHAR(block_time, 'MM-DD HH24:MI')
    FROM staking_rewards 
    WHERE block_height BETWEEN 1186194 AND 3091681
    ORDER BY block_height DESC 
    LIMIT 5;
    " | sed 's/^/    /'
}

# Function to calculate progress percentage
get_progress() {
    # Total blocks to scan: 3091681 - 1186194 + 1 = 1905488
    TOTAL_BLOCKS=1905488
    
    # Get the latest block processed (this is not accurate for progress)
    LATEST_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
    SELECT MAX(block_height) FROM staking_rewards WHERE block_height BETWEEN 1186194 AND 3091681;
    " | tr -d ' ')
    
    if [ -z "$LATEST_BLOCK" ]; then
        LATEST_BLOCK=1186194
    fi
    
    # Since we can't track actual progress, show "Scanning..." instead of percentage
    echo "SCANNING"
}

# Function to show progress bar
show_progress_bar() {
    local status=$1
    local width=50
    
    if [ "$status" = "SCANNING" ]; then
        echo -e "${BLUE}Status: [${NC}"
        printf "${GREEN}%*s${NC}" $width | tr ' ' '█'
        echo -e "${BLUE}] SCANNING...${NC}"
    else
        local percent=$status
        local filled=$((percent * width / 100))
        local empty=$((width - filled))
        
        echo -e "${BLUE}Progress: [${NC}"
        printf "${GREEN}%*s${NC}" $filled | tr ' ' '█'
        printf "${WHITE}%*s${NC}" $empty | tr ' ' '░'
        echo -e "${BLUE}] ${percent}%${NC}"
    fi
}

# Main monitoring loop
main() {
    while true; do
        show_header
        
        # Scanner status
        echo -e "${WHITE}📊 SCANNER STATUS:${NC}"
        echo "=================="
        if get_scanner_status; then
            echo -e "${YELLOW}Process Info:${NC}"
            get_process_stats | while read line; do
                echo -e "    $line"
            done
        else
            echo -e "${RED}Scanner is not running!${NC}"
            break
        fi
        
        echo ""
        
        # Progress bar
        echo -e "${WHITE}📈 PROGRESS:${NC}"
        echo "============"
        PROGRESS=$(get_progress)
        show_progress_bar $PROGRESS
        echo ""
        
        # Database stats
        echo -e "${WHITE}📊 DATABASE STATS:${NC}"
        echo "=================="
        echo -e "${CYAN}$(get_database_stats)${NC}"
        echo ""
        
        # Pancho77@ stats
        echo -e "${WHITE}🎯 PANCHO77@ STATS:${NC}"
        echo "=================="
        echo -e "${PURPLE}$(get_pancho_stats)${NC}"
        echo ""
        
        # Recent stakes
        echo -e "${WHITE}🆕 RECENT STAKES:${NC}"
        echo "=================="
        get_recent_stakes
        echo ""
        
        # Footer
        echo -e "${CYAN}⏰ Last updated: $(date '+%H:%M:%S') | Press Ctrl+C to exit${NC}"
        echo ""
        
        # Wait 5 seconds before next update
        sleep 5
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}👋 Monitoring stopped. Goodbye!${NC}"; exit 0' INT

# Start monitoring
main
