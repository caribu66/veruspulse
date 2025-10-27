#!/bin/bash
###############################################################################
# Continue Optimized Staking Scan
# Resumes from the last scanned block to current blockchain tip
# Optimized for maximum efficiency without hammering RPC
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Continue Optimized VerusID Staking Scan                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Next.js dev server is running
echo -e "${YELLOW}🔍 Checking Next.js server...${NC}"
if ! curl -s http://localhost:3000/api/admin/mass-scan > /dev/null 2>&1; then
    echo -e "${RED}❌ Next.js server is not running on port 3000${NC}"
    echo -e "${BLUE}💡 Start it first: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Next.js server is running${NC}"

# Check if a scan is already running
echo -e "${YELLOW}🔍 Checking for existing scan...${NC}"
RUNNING=$(curl -s http://localhost:3000/api/admin/mass-scan | jq -r '.isRunning')

if [ "$RUNNING" = "true" ]; then
    echo -e "${YELLOW}⚠️  A scan is already in progress!${NC}"
    echo ""
    curl -s http://localhost:3000/api/admin/mass-scan | jq '{
        phase: .progress.currentPhase,
        blocksProcessed: .progress.blocksProcessed,
        totalBlocks: .progress.totalBlocks,
        stakesFound: .progress.stakeEventsFound,
        percentComplete: .progress.percentages.blocks
    }'
    echo ""
    echo -e "${BLUE}💡 Monitor with: ./scripts/monitor-scan.sh${NC}"
    exit 0
fi
echo -e "${GREEN}✅ No scan running${NC}"

# Get current database status
echo -e "${YELLOW}📊 Checking database status...${NC}"
DB_STATS=$(PGPASSWORD=verus_secure_2024 psql -h localhost -U verus_user -d verus_utxo_db -t -c "
SELECT 
    COALESCE(MAX(block_height), 0) as last_block,
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as unique_identities
FROM staking_rewards;
" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Could not connect to database${NC}"
    echo -e "${BLUE}💡 Check that PostgreSQL is running${NC}"
    exit 1
fi

LAST_BLOCK=$(echo "$DB_STATS" | awk '{print $1}')
TOTAL_STAKES=$(echo "$DB_STATS" | awk '{print $3}')
UNIQUE_IDS=$(echo "$DB_STATS" | awk '{print $5}')

echo -e "${GREEN}✅ Database Status:${NC}"
echo -e "   Last scanned block: ${CYAN}${LAST_BLOCK}${NC}"
echo -e "   Total stakes: ${CYAN}${TOTAL_STAKES}${NC}"
echo -e "   Unique VerusIDs: ${CYAN}${UNIQUE_IDS}${NC}"
echo ""

# Get current blockchain tip
echo -e "${YELLOW}🔗 Checking blockchain tip...${NC}"
BLOCKCHAIN_INFO=$(curl -s http://localhost:3000/api/blockchain/info 2>/dev/null)
CURRENT_TIP=$(echo "$BLOCKCHAIN_INFO" | jq -r '.blocks' 2>/dev/null)

if [ "$CURRENT_TIP" = "null" ] || [ -z "$CURRENT_TIP" ]; then
    echo -e "${YELLOW}⚠️  Could not get blockchain tip from API, trying RPC...${NC}"
    CURRENT_TIP=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
fi

if [ -z "$CURRENT_TIP" ] || [ "$CURRENT_TIP" = "null" ]; then
    echo -e "${RED}❌ Could not determine blockchain tip${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Current blockchain tip: ${CYAN}${CURRENT_TIP}${NC}"
echo ""

# Calculate what needs to be scanned
START_HEIGHT=$((LAST_BLOCK + 1))
BLOCKS_TO_SCAN=$((CURRENT_TIP - LAST_BLOCK))

if [ $BLOCKS_TO_SCAN -le 0 ]; then
    echo -e "${GREEN}🎉 Database is already up to date!${NC}"
    echo -e "   Current tip: $CURRENT_TIP"
    echo -e "   Last scanned: $LAST_BLOCK"
    exit 0
fi

# Display scan summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                          Scan Summary                                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ${CYAN}From Block:${NC}     $START_HEIGHT"
echo -e "   ${CYAN}To Block:${NC}       $CURRENT_TIP"
echo -e "   ${CYAN}Blocks to Scan:${NC} $BLOCKS_TO_SCAN"
echo ""

# Estimate time based on blocks
BLOCKS_PER_DAY=$((24 * 60 * 60 / 60))  # ~1440 blocks per day
DAYS_OF_DATA=$((BLOCKS_TO_SCAN / BLOCKS_PER_DAY))

echo -e "   ${CYAN}Estimated Coverage:${NC} ~$DAYS_OF_DATA days of blockchain data"
echo ""

# Choose optimization profile based on blocks to scan
if [ $BLOCKS_TO_SCAN -lt 50000 ]; then
    PROFILE="recent"
    CONCURRENT=5
    DELAY=50
    BATCH=100
    EST_TIME="1-3 hours"
    echo -e "${GREEN}📊 Profile: RECENT (Fast scan for < 50K blocks)${NC}"
elif [ $BLOCKS_TO_SCAN -lt 500000 ]; then
    PROFILE="balanced"
    CONCURRENT=3
    DELAY=100
    BATCH=50
    EST_TIME="10-20 hours"
    echo -e "${YELLOW}📊 Profile: BALANCED (Medium scan for < 500K blocks)${NC}"
else
    PROFILE="conservative"
    CONCURRENT=2
    DELAY=200
    BATCH=25
    EST_TIME="30-60 hours"
    echo -e "${CYAN}📊 Profile: CONSERVATIVE (Large scan for $BLOCKS_TO_SCAN blocks)${NC}"
fi

echo ""
echo -e "   ${CYAN}Optimization Settings:${NC}"
echo -e "   - Concurrent requests: $CONCURRENT"
echo -e "   - Delay between batches: ${DELAY}ms"
echo -e "   - Block batch size: $BATCH"
echo -e "   - Estimated time: ${EST_TIME}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}❓ Ready to start optimized scan?${NC}"
echo -e "   This will scan ${CYAN}${BLOCKS_TO_SCAN}${NC} blocks from ${CYAN}${START_HEIGHT}${NC} to ${CYAN}${CURRENT_TIP}${NC}"
echo ""
read -p "Continue? [Y/n]: " confirm
confirm=${confirm:-Y}

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Scan cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting optimized scan...${NC}"
echo ""

# Start the scan with optimized settings
RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/mass-scan \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"start\",
        \"config\": {
            \"maxConcurrentRequests\": $CONCURRENT,
            \"delayBetweenBatches\": $DELAY,
            \"blockBatchSize\": $BATCH,
            \"addressBatchSize\": 10,
            \"cacheBlockData\": true,
            \"maxRetries\": 3,
            \"backoffMultiplier\": 2
        },
        \"options\": {
            \"startFromHeight\": $START_HEIGHT,
            \"endAtHeight\": $CURRENT_TIP,
            \"limitAddresses\": 10000
        }
    }")

# Check if scan started successfully
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Scan started successfully!${NC}"
    echo ""
    echo "$RESPONSE" | jq '{
        message,
        config,
        progress: {
            phase: .progress.currentPhase,
            totalAddresses: .progress.totalAddresses,
            totalBlocks: .progress.totalBlocks
        }
    }'
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                        Monitoring Commands                                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Real-time monitor:${NC}"
    echo -e "    ./scripts/monitor-scan.sh"
    echo ""
    echo -e "  ${CYAN}Quick status check:${NC}"
    echo -e "    curl -s http://localhost:3000/api/admin/mass-scan | jq"
    echo ""
    echo -e "  ${CYAN}Stop scan (if needed):${NC}"
    echo -e "    ./scripts/stop-scan.sh"
    echo ""
    echo -e "${GREEN}🎉 Scan is now running in the background!${NC}"
    echo ""
else
    echo -e "${RED}❌ Failed to start scan${NC}"
    echo "$RESPONSE" | jq
    exit 1
fi

