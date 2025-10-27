#!/bin/bash
###############################################################################
# monitor-scanning-progress.sh
# Monitor the progress of the continuous VerusID scanning
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/continue-scanning-api.log"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    VerusID Scanning Progress Monitor                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if scanning process is running
echo -e "${YELLOW}📋 Checking scanning process status...${NC}"
if pgrep -f "continue-scanning-api.js" > /dev/null; then
    echo -e "  ✅ Scanning process is running"
    PROCESS_PID=$(pgrep -f "continue-scanning-api.js")
    echo -e "  🆔 Process ID: $PROCESS_PID"
else
    echo -e "  ❌ Scanning process is not running"
    echo -e "  💡 Start it with: ${PURPLE}nohup node scripts/continue-scanning-api.js > logs/continue-scanning-api.log 2>&1 &${NC}"
    exit 1
fi

# Check log file
if [[ ! -f "$LOG_FILE" ]]; then
    echo -e "  ❌ Log file not found: $LOG_FILE"
    exit 1
fi

echo ""

# Get current blockchain height
echo -e "${YELLOW}📊 Getting current blockchain status...${NC}"
CURRENT_HEIGHT=$(curl -s "http://localhost:3000/api/consolidated-data" | jq -r '.data.blockchain.blocks')
echo -e "  🌐 Current blockchain height: ${GREEN}$CURRENT_HEIGHT${NC}"

# Get highest scanned block from database
HIGHEST_SCANNED=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
if [[ -z "$HIGHEST_SCANNED" || "$HIGHEST_SCANNED" == "" ]]; then
    HIGHEST_SCANNED="800200"
fi
echo -e "  📊 Highest scanned block: ${YELLOW}$HIGHEST_SCANNED${NC}"

# Calculate progress
BLOCKS_REMAINING=$((CURRENT_HEIGHT - HIGHEST_SCANNED))
if [[ $BLOCKS_REMAINING -gt 0 ]]; then
    PROGRESS_PERCENT=$(( (HIGHEST_SCANNED * 100) / CURRENT_HEIGHT ))
    echo -e "  📈 Progress: ${GREEN}${PROGRESS_PERCENT}%${NC} (${BLOCKS_REMAINING} blocks remaining)"
else
    echo -e "  ✅ ${GREEN}Up to date!${NC}"
fi

echo ""

# Show recent scanning activity
echo -e "${YELLOW}📋 Recent scanning activity:${NC}"
if [[ -f "$LOG_FILE" ]]; then
    # Get the last few lines of activity
    tail -20 "$LOG_FILE" | grep -E "(Processing batch|Batch complete|Progress:|Total Progress:)" | tail -5 | while read line; do
        echo -e "  📝 $line"
    done
else
    echo -e "  ❌ No log file found"
fi

echo ""

# Show statistics from log
echo -e "${YELLOW}📊 Scanning statistics:${NC}"
if [[ -f "$LOG_FILE" ]]; then
    # Extract statistics from log
    TOTAL_BLOCKS=$(grep "Total blocks:" "$LOG_FILE" | tail -1 | grep -o '[0-9]*' | head -1 || echo "0")
    TOTAL_STAKES=$(grep "Total stakes:" "$LOG_FILE" | tail -1 | grep -o '[0-9]*' | head -1 || echo "0")
    TOTAL_VERUSIDS=$(grep "Total new VerusIDs:" "$LOG_FILE" | tail -1 | grep -o '[0-9]*' | head -1 || echo "0")
    RUNTIME=$(grep "Runtime:" "$LOG_FILE" | tail -1 | grep -o '[0-9.]* minutes' || echo "0 minutes")
    
    echo -e "  📦 Total blocks scanned: ${GREEN}$TOTAL_BLOCKS${NC}"
    echo -e "  💰 Total stakes found: ${GREEN}$TOTAL_STAKES${NC}"
    echo -e "  👤 Total new VerusIDs: ${GREEN}$TOTAL_VERUSIDS${NC}"
    echo -e "  ⏱️  Runtime: ${GREEN}$RUNTIME${NC}"
fi

echo ""

# Show database statistics
echo -e "${YELLOW}📊 Database statistics:${NC}"
VERUSID_COUNT=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%';" 2>/dev/null | tr -d ' ')
STAKING_REWARDS_COUNT=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards;" 2>/dev/null | tr -d ' ')

echo -e "  👤 Total VerusIDs in database: ${GREEN}$VERUSID_COUNT${NC}"
echo -e "  💰 Total staking rewards: ${GREEN}$STAKING_REWARDS_COUNT${NC}"

echo ""

# Show recent VerusID data freshness
echo -e "${YELLOW}📊 VerusID data freshness:${NC}"
LATEST_REFRESH=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(last_refreshed_at) FROM identities;" 2>/dev/null | tr -d ' ')
LATEST_STAKE=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(block_time) FROM staking_rewards;" 2>/dev/null | tr -d ' ')

echo -e "  🕒 Latest refresh: ${GREEN}$LATEST_REFRESH${NC}"
echo -e "  💰 Latest stake: ${GREEN}$LATEST_STAKE${NC}"

echo ""

# Show API endpoint status
echo -e "${YELLOW}📊 API endpoint status:${NC}"
API_RESPONSE=$(curl -s "http://localhost:3000/api/verusids/browse?sort=recent&limit=1" 2>/dev/null)
if echo "$API_RESPONSE" | jq -e '.success == true' &> /dev/null; then
    LAST_REFRESH_API=$(echo "$API_RESPONSE" | jq -r '.data.identities[0].lastRefreshed')
    echo -e "  ✅ API endpoint accessible"
    echo -e "  🕒 Last refresh via API: ${GREEN}$LAST_REFRESH_API${NC}"
else
    echo -e "  ❌ API endpoint not accessible"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Scanning is active and making progress!${NC}"
echo ""
echo -e "${BLUE}💡 Management Commands:${NC}"
echo "  • View live logs:     tail -f $LOG_FILE"
echo "  • Stop scanning:      pkill -f 'continue-scanning-api.js'"
echo "  • Restart scanning:   nohup node scripts/continue-scanning-api.js > logs/continue-scanning-api.log 2>&1 &"
echo "  • Check this status:  ./scripts/monitor-scanning-progress.sh"
echo ""
echo -e "${BLUE}📈 The scanning will continue automatically until caught up!${NC}"
