#!/bin/bash
###############################################################################
# Quick Scan Status Checker
# Displays current scan status and database statistics in a compact format
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        Scan Status Check                                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to format numbers
format_num() {
    printf "%'d" "$1" 2>/dev/null || echo "$1"
}

# Check API availability
if ! curl -s http://localhost:3000/api/admin/mass-scan > /dev/null 2>&1; then
    echo -e "${RED}❌ Next.js server not running${NC}"
    echo -e "${YELLOW}Start with: npm run dev${NC}"
    exit 1
fi

# Get scan status
RESPONSE=$(curl -s http://localhost:3000/api/admin/mass-scan)
IS_RUNNING=$(echo "$RESPONSE" | jq -r '.isRunning')

echo -e "${CYAN}▶ Scan Status:${NC}"
if [ "$IS_RUNNING" = "true" ]; then
    PHASE=$(echo "$RESPONSE" | jq -r '.progress.currentPhase')
    BLOCKS_DONE=$(echo "$RESPONSE" | jq -r '.progress.blocksProcessed')
    TOTAL_BLOCKS=$(echo "$RESPONSE" | jq -r '.progress.totalBlocks')
    PERCENT=$(echo "$RESPONSE" | jq -r '.progress.percentages.blocks' | cut -d. -f1)
    STAKES=$(echo "$RESPONSE" | jq -r '.progress.stakeEventsFound')
    BLOCKS_SEC=$(echo "$RESPONSE" | jq -r '.progress.rates.blocksPerSecond')
    
    echo -e "  ${GREEN}🟢 RUNNING${NC} - Phase: $PHASE"
    echo -e "  Progress: ${CYAN}$PERCENT%${NC} ($(format_num $BLOCKS_DONE) / $(format_num $TOTAL_BLOCKS) blocks)"
    echo -e "  Stakes found: ${GREEN}$(format_num $STAKES)${NC}"
    echo -e "  Speed: ${CYAN}${BLOCKS_SEC}${NC} blocks/sec"
else
    echo -e "  ${YELLOW}⏸️  IDLE${NC}"
fi
echo ""

# Get database status
echo -e "${CYAN}▶ Database Status:${NC}"
DB_STATS=$(PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -t -A -c "
SELECT 
    COALESCE(MAX(block_height), 0) as last_block,
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as unique_ids
FROM staking_rewards;
" 2>/dev/null)

if [ $? -eq 0 ]; then
    IFS='|' read -r LAST_BLOCK TOTAL_STAKES UNIQUE_IDS <<< "$DB_STATS"
    echo -e "  Last block: ${CYAN}$(format_num $LAST_BLOCK)${NC}"
    echo -e "  Total stakes: ${GREEN}$(format_num $TOTAL_STAKES)${NC}"
    echo -e "  Unique VerusIDs: ${CYAN}$(format_num $UNIQUE_IDS)${NC}"
else
    echo -e "  ${RED}❌ Database not accessible${NC}"
fi
echo ""

# Get blockchain tip
echo -e "${CYAN}▶ Blockchain Status:${NC}"
CURRENT_TIP=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
if [ -n "$CURRENT_TIP" ]; then
    echo -e "  Current tip: ${CYAN}$(format_num $CURRENT_TIP)${NC}"
    
    if [ -n "$LAST_BLOCK" ] && [ "$LAST_BLOCK" != "0" ]; then
        BLOCKS_BEHIND=$((CURRENT_TIP - LAST_BLOCK))
        if [ $BLOCKS_BEHIND -gt 0 ]; then
            echo -e "  Blocks behind: ${YELLOW}$(format_num $BLOCKS_BEHIND)${NC}"
        else
            echo -e "  ${GREEN}✅ Fully synced!${NC}"
        fi
    fi
else
    echo -e "  ${YELLOW}⚠️  Cannot reach RPC${NC}"
fi
echo ""

# Show quick actions
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                          Quick Actions                                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$IS_RUNNING" = "true" ]; then
    echo -e "  📊 Monitor:    ${CYAN}./scripts/monitor-scan.sh${NC}"
    echo -e "  ⏸️  Stop:       ${CYAN}./scripts/stop-scan.sh${NC}"
else
    if [ -n "$LAST_BLOCK" ] && [ -n "$CURRENT_TIP" ] && [ $BLOCKS_BEHIND -gt 0 ]; then
        echo -e "  🚀 Continue scan: ${CYAN}./scripts/continue-staking-scan-optimized.sh${NC}"
    else
        echo -e "  🚀 Start scan:    ${CYAN}./scripts/start-mass-scan.sh${NC}"
    fi
fi
echo ""
