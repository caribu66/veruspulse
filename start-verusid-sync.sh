#!/bin/bash
# Start Comprehensive VerusID Staking and UTXO Data Sync
# This script initiates both staking data and UTXO synchronization

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     VerusID Staking & UTXO Data Synchronization              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if database is accessible
echo -e "${BLUE}🔍 Checking database connection...${NC}"
export PGPASSWORD=verus_secure_2024
if psql -h localhost -U verus_user -d verus_utxo_db -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running and credentials are correct${NC}"
    exit 1
fi

# Check if Next.js server is running
echo -e "${BLUE}🔍 Checking Next.js server...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Next.js server is running${NC}"
else
    echo -e "${RED}✗ Next.js server is not running${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
    exit 1
fi

# Check if verusd is accessible
echo -e "${BLUE}🔍 Checking Verus daemon...${NC}"
VERUS_CHECK=$(curl -s --user verus:verus --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' -H 'content-type: text/plain;' http://192.168.86.89:18843/ 2>&1)
if echo "$VERUS_CHECK" | grep -q "result"; then
    BLOCK_HEIGHT=$(echo "$VERUS_CHECK" | jq -r '.result')
    echo -e "${GREEN}✓ Verus daemon is accessible (Current height: $BLOCK_HEIGHT)${NC}"
else
    echo -e "${RED}✗ Verus daemon is not accessible${NC}"
    echo -e "${YELLOW}Please ensure verusd is running and RPC is configured${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All prerequisites are met!${NC}"
echo ""

# Check current sync status
echo -e "${BLUE}📊 Checking current sync status...${NC}"
STAKING_COUNT=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards" 2>/dev/null || echo "0")
VERUSID_COUNT=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM verusid_statistics" 2>/dev/null || echo "0")
IDENTITY_COUNT=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM identities" 2>/dev/null || echo "0")

echo -e "${BLUE}Current database status:${NC}"
echo "  • Staking rewards: $(echo $STAKING_COUNT | xargs)"
echo "  • VerusID statistics: $(echo $VERUSID_COUNT | xargs)"
echo "  • Total identities: $(echo $IDENTITY_COUNT | xargs)"
echo ""

# Menu for sync options
echo -e "${YELLOW}Choose sync mode:${NC}"
echo "1) 🚀 Full Comprehensive Sync (ALL historical data - RECOMMENDED)"
echo "2) ⚡ Recent Sync (Last 30 days - Fast)"
echo "3) 📊 UTXO Data Only (Update current UTXO statistics)"
echo "4) 🔄 Background Auto-Update (Continuous UTXO monitoring)"
echo "5) 📈 Custom Scan Configuration"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Starting FULL COMPREHENSIVE SYNC${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BLUE}This will:${NC}"
        echo "  • Scan ALL blocks from VerusID activation (block 800,200)"
        echo "  • Extract ALL staking events for ALL VerusIDs"
        echo "  • Calculate comprehensive statistics"
        echo "  • Update UTXO data for all addresses"
        echo ""
        echo -e "${YELLOW}Estimated time: 20-40 hours${NC}"
        echo -e "${YELLOW}This scan can be paused and resumed at any time (Ctrl+C)${NC}"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm != [yY] ]]; then
            echo "Cancelled."
            exit 0
        fi
        
        echo ""
        echo -e "${GREEN}🚀 Starting comprehensive scan...${NC}"
        echo ""
        
        # Run the comprehensive scanner in the background with logging
        cd /home/explorer/verus-dapp
        nohup node scripts/scan-all-verusids-comprehensive.js > logs/verusid-sync-$(date +%Y%m%d-%H%M%S).log 2>&1 &
        SYNC_PID=$!
        
        echo -e "${GREEN}✅ Sync started in background (PID: $SYNC_PID)${NC}"
        echo ""
        echo -e "${BLUE}📊 Monitor progress with:${NC}"
        echo "  tail -f logs/verusid-sync-*.log"
        echo ""
        echo -e "${BLUE}💾 Progress is saved automatically. To resume after stopping:${NC}"
        echo "  ./start-verusid-sync.sh"
        echo ""
        ;;
        
    2)
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Starting RECENT (30 days) SYNC${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BLUE}This will scan the last ~43,200 blocks (30 days)${NC}"
        echo -e "${YELLOW}Estimated time: 2-6 hours${NC}"
        echo ""
        
        # Calculate start height (current - 30 days worth of blocks)
        BLOCKS_PER_DAY=1440 # 1 block per minute
        DAYS=30
        START_HEIGHT=$((BLOCK_HEIGHT - (BLOCKS_PER_DAY * DAYS)))
        
        echo "Scanning from block $START_HEIGHT to $BLOCK_HEIGHT"
        echo ""
        
        # Run scan with custom start height
        cd /home/explorer/verus-dapp
        nohup node scripts/scan-all-verusids-for-stakes.js --start-height $START_HEIGHT > logs/verusid-recent-sync-$(date +%Y%m%d-%H%M%S).log 2>&1 &
        SYNC_PID=$!
        
        echo -e "${GREEN}✅ Recent sync started in background (PID: $SYNC_PID)${NC}"
        echo ""
        echo -e "${BLUE}📊 Monitor progress with:${NC}"
        echo "  tail -f logs/verusid-recent-sync-*.log"
        echo ""
        ;;
        
    3)
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Updating UTXO Data${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        cd /home/explorer/verus-dapp
        node scripts/update-utxo-statistics.js
        
        echo ""
        echo -e "${GREEN}✅ UTXO data updated!${NC}"
        ;;
        
    4)
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Starting Background Auto-Update Service${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BLUE}This will update UTXO statistics every 2 minutes${NC}"
        echo ""
        
        cd /home/explorer/verus-dapp
        nohup node scripts/auto-update-utxos.js > logs/auto-update-utxos-$(date +%Y%m%d-%H%M%S).log 2>&1 &
        SYNC_PID=$!
        
        echo -e "${GREEN}✅ Auto-update service started (PID: $SYNC_PID)${NC}"
        echo ""
        echo -e "${BLUE}📊 Monitor with:${NC}"
        echo "  tail -f logs/auto-update-utxos-*.log"
        echo ""
        echo -e "${BLUE}Stop with:${NC}"
        echo "  kill $SYNC_PID"
        echo ""
        ;;
        
    5)
        echo ""
        echo -e "${YELLOW}Custom Scan Configuration${NC}"
        echo ""
        read -p "Start block height [$((BLOCK_HEIGHT - 10000))]: " start_height
        start_height=${start_height:-$((BLOCK_HEIGHT - 10000))}
        read -p "End block height [$BLOCK_HEIGHT]: " end_height
        end_height=${end_height:-$BLOCK_HEIGHT}
        
        echo ""
        echo -e "${GREEN}Starting custom scan from $start_height to $end_height${NC}"
        echo ""
        
        cd /home/explorer/verus-dapp
        # Note: You may need to modify the script to accept these parameters
        nohup node scripts/scan-all-verusids-for-stakes.js --start-height $start_height --end-height $end_height > logs/verusid-custom-sync-$(date +%Y%m%d-%H%M%S).log 2>&1 &
        SYNC_PID=$!
        
        echo -e "${GREEN}✅ Custom sync started (PID: $SYNC_PID)${NC}"
        echo ""
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Sync Process Information${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo ""
echo "  ${YELLOW}Check sync status:${NC}"
echo "    psql -h localhost -U verus_user -d verus_utxo_db -c \"SELECT scan_type, scan_progress FROM scan_metadata\""
echo ""
echo "  ${YELLOW}View staking rewards count:${NC}"
echo "    psql -h localhost -U verus_user -d verus_utxo_db -c \"SELECT COUNT(*) FROM staking_rewards\""
echo ""
echo "  ${YELLOW}View VerusID statistics:${NC}"
echo "    psql -h localhost -U verus_user -d verus_utxo_db -c \"SELECT COUNT(*) FROM verusid_statistics\""
echo ""
echo "  ${YELLOW}View latest sync progress:${NC}"
echo "    ./scripts/check-scan-status.sh"
echo ""
echo "  ${YELLOW}Monitor logs in real-time:${NC}"
echo "    tail -f logs/verusid-sync-*.log"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

