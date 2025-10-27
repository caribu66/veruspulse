#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        STAKING DATA PROGRESS CHECKER                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Next.js app is running
if ! curl -s -o /dev/null -w "%{httpReferrer}" http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Next.js application is not running on port 3000${NC}"
    echo -e "${YELLOW}💡 Start it with: npm run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Next.js application is running${NC}"
echo ""

# Get current blockchain height
echo -e "${BLUE}📊 Blockchain Status:${NC}"
CURRENT_HEIGHT=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
if [ -n "$CURRENT_HEIGHT" ]; then
    echo -e "   Current blockchain height: ${GREEN}$CURRENT_HEIGHT${NC}"
else
    echo -e "   ${RED}❌ Could not get blockchain height${NC}"
    echo -e "   ${YELLOW}💡 Is verusd running?${NC}"
fi

# Get staking data overview
echo ""
echo -e "${BLUE}📊 Staking Data Status:${NC}"
STAKING_DATA=$(curl -s http://localhost:3000/api/verusid/staking-overview 2>/dev/null)

if [ -n "$STAKING_DATA" ]; then
    TOTAL_STAKES=$(echo "$STAKING_DATA" | jq -r '.totalStakes // "Unknown"')
    LATEST_BLOCK=$(echo "$STAKING_DATA" | jq -r '.latestBlock // "Unknown"')
    EARLIEST_STAKE=$(echo "$STAKING_DATA" | jq -r '.earliestStake // "Unknown"')
    LATEST_STAKE=$(echo "$STAKING_DATA" | jq -r '.latestStake // "Unknown"')
    
    echo -e "   Total stake events: ${GREEN}$TOTAL_STAKES${NC}"
    echo -e "   Latest block in database: ${GREEN}$LATEST_BLOCK${NC}"
    echo -e "   Date range: ${GREEN}$EARLIEST_STAKE${NC} to ${GREEN}$LATEST_STAKE${NC}"
    
    # Calculate progress
    if [ "$CURRENT_HEIGHT" != "Unknown" ] && [ "$LATEST_BLOCK" != "Unknown" ]; then
        BLOCKS_MISSING=$((CURRENT_HEIGHT - LATEST_BLOCK))
        if [ "$BLOCKS_MISSING" -lt 0 ]; then
            BLOCKS_MISSING=0
        fi
        PERCENTAGE=$(( (LATEST_BLOCK * 100) / CURRENT_HEIGHT ))
        echo -e "   Blocks missing: ${YELLOW}$BLOCKS_MISSING${NC}"
        echo -e "   Coverage: ${GREEN}$PERCENTAGE%${NC}"
    fi
else
    echo -e "   ${RED}❌ Could not get staking data${NC}"
    echo -e "   ${YELLOW}💡 Check if the API is responding${NC}"
fi

# Check if scans are running
echo ""
echo -e "${BLUE}📊 Active Scans:${NC}"
SCAN_STATUS=$(curl -s http://localhost:3000/api/admin/comprehensive-scan 2>/dev/null)

if [ -n "$SCAN_STATUS" ]; then
    IS_RUNNING=$(echo "$SCAN_STATUS" | jq -r '.isRunning // false')
    if [ "$IS_RUNNING" = "true" ]; then
        CURRENT_HEIGHT_SCAN=$(echo "$SCAN_STATUS" | jq -r '.progress.currentHeight // "Unknown"')
        STAKE_EVENTS_FOUND=$(echo "$SCAN_STATUS" | jq -r '.progress.stakeEventsFound // 0')
        echo -e "   Comprehensive scan: ${GREEN}RUNNING${NC}"
        echo -e "   Current height: ${GREEN}$CURRENT_HEIGHT_SCAN${NC}"
        echo -e "   Stakes found in this scan: ${GREEN}$STAKE_EVENTS_FOUND${NC}"
    else
        echo -e "   Comprehensive scan: ${YELLOW}NOT RUNNING${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Could not check scan status${NC}"
fi

echo ""
echo -e "${BLUE}💡 To monitor continuously, run:${NC}"
echo -e "   ${YELLOW}watch -n 10 ./check-staking-progress.sh${NC}"
echo ""
echo -e "${BLUE}💡 To check specific VerusID data:${NC}"
echo -e "   ${YELLOW}curl -s http://localhost:3000/api/verusid/\$IDENTITY_ADDRESS${NC}"











