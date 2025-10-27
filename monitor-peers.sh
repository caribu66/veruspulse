#!/bin/bash
###############################################################################
# VerusCoin Peer Connection Monitor
# Monitor peer connections in real-time
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

VERUS_CLI_PATH="/home/explorer/verus-cli/verus"

while true; do
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    VerusCoin Peer Connection Monitor                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if pgrep -f verusd > /dev/null; then
        echo -e "${GREEN}🟢 VerusCoin daemon is running${NC}"
        echo ""
        
        # Get connection count
        if command -v "$VERUS_CLI_PATH" &> /dev/null; then
            CONN_COUNT=$("$VERUS_CLI_PATH" getconnectioncount 2>/dev/null || echo "0")
            echo -e "${BLUE}📊 Current connections: $CONN_COUNT${NC}"
            
            if [ "$CONN_COUNT" -gt 5 ]; then
                echo -e "${GREEN}✅ Excellent! You have more than 5 peers ($CONN_COUNT)${NC}"
            elif [ "$CONN_COUNT" -gt 0 ]; then
                echo -e "${YELLOW}⚠️  You have $CONN_COUNT peers. Waiting for more...${NC}"
            else
                echo -e "${RED}❌ No connections yet. Please wait...${NC}"
            fi
            
            echo ""
            echo -e "${BLUE}🔍 Recent peer connections:${NC}"
            "$VERUS_CLI_PATH" getpeerinfo 2>/dev/null | jq -r '.[] | "\(.addr) - \(.subver // "Unknown")"' | head -10 2>/dev/null || echo "No peer info available"
            
            echo ""
            echo -e "${BLUE}📈 Sync status:${NC}"
            BLOCK_INFO=$("$VERUS_CLI_PATH" getblockchaininfo 2>/dev/null || echo "{}")
            CURRENT_BLOCK=$(echo "$BLOCK_INFO" | jq -r '.blocks // 0')
            HEADERS=$(echo "$BLOCK_INFO" | jq -r '.headers // 0')
            VERIFICATION_PROGRESS=$(echo "$BLOCK_INFO" | jq -r '.verificationprogress // 0')
            
            echo -e "   Current block: $CURRENT_BLOCK"
            echo -e "   Headers: $HEADERS"
            echo -e "   Progress: $(echo "$VERIFICATION_PROGRESS * 100" | bc -l 2>/dev/null | cut -d. -f1)%"
            
        else
            echo -e "${YELLOW}⚠️  verus-cli not found at $VERUS_CLI_PATH${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}⏰ Updated: $(date)${NC}"
        echo -e "${BLUE}Press Ctrl+C to stop monitoring${NC}"
        
    else
        echo -e "${RED}❌ VerusCoin daemon is not running${NC}"
        echo -e "${BLUE}💡 Start it with: ./start-verusd-optimized.sh${NC}"
    fi
    
    sleep 5
done
