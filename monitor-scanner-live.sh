#!/bin/bash
# Live monitoring of the optimized staking scanner

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           OPTIMIZED STAKING SCANNER MONITOR                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Database credentials
export PGPASSWORD=verus_secure_2024
DB_HOST="localhost"
DB_USER="verus_user"
DB_NAME="verus_utxo_db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

while true; do
    clear
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           OPTIMIZED STAKING SCANNER MONITOR                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check if scanner is running
    SCANNER_PID=$(ps aux | grep "optimize-staking-scanner-fixed-creations.js" | grep -v grep | awk '{print $2}')
    if [ -n "$SCANNER_PID" ]; then
        echo -e "${GREEN}✅ Scanner Status: RUNNING (PID: $SCANNER_PID)${NC}"
    else
        echo -e "${RED}❌ Scanner Status: NOT RUNNING${NC}"
    fi
    
    echo ""
    
    # Get current blockchain height
    CURRENT_HEIGHT=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null || echo "0")
    echo -e "${BLUE}📊 Current Blockchain Height: ${CURRENT_HEIGHT}${NC}"
    
    # Get database stats
    DB_STATS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
    SELECT 
      COUNT(*) as total_stakes,
      COUNT(DISTINCT identity_address) as unique_verusids,
      MAX(block_height) as latest_block,
      MIN(block_height) as earliest_block,
      ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
    FROM staking_rewards
    " 2>/dev/null | xargs)
    
    if [ -n "$DB_STATS" ]; then
        IFS='|' read -r TOTAL_STAKES UNIQUE_VERUSIDS LATEST_BLOCK EARLIEST_BLOCK TOTAL_VRSC <<< "$DB_STATS"
        
        echo -e "${BLUE}📊 Database Statistics:${NC}"
        echo "   Total Stakes: $TOTAL_STAKES"
        echo "   Unique VerusIDs: $UNIQUE_VERUSIDS"
        echo "   Latest Block: $LATEST_BLOCK"
        echo "   Total VRSC: $TOTAL_VRSC"
        echo ""
        
        # Calculate progress
        if [ "$CURRENT_HEIGHT" -gt 0 ] && [ "$LATEST_BLOCK" -gt 0 ]; then
            BLOCKS_BEHIND=$((CURRENT_HEIGHT - LATEST_BLOCK))
            PROGRESS_PERCENT=$(echo "scale=2; ($LATEST_BLOCK / $CURRENT_HEIGHT) * 100" | bc 2>/dev/null || echo "0")
            
            echo -e "${YELLOW}📈 Scan Progress:${NC}"
            echo "   Blocks Behind: $BLOCKS_BEHIND"
            echo "   Progress: $PROGRESS_PERCENT%"
            
            if [ "$BLOCKS_BEHIND" -lt 1000 ]; then
                echo -e "   ${GREEN}Status: Almost caught up!${NC}"
            elif [ "$BLOCKS_BEHIND" -lt 10000 ]; then
                echo -e "   ${YELLOW}Status: Making good progress${NC}"
            else
                echo -e "   ${RED}Status: Still catching up${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ Could not connect to database${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Press Ctrl+C to exit"
    echo "Last updated: $(date)"
    
    sleep 10
done
