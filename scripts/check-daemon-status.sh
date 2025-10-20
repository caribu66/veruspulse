#!/bin/bash

##############################################################################
# Quick Daemon Status Check
# Single snapshot of daemon status (non-continuous)
##############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# RPC credentials
RPC_USER="${VERUS_RPC_USER:-verus}"
RPC_PASSWORD="${VERUS_RPC_PASSWORD:-verus}"
RPC_HOST="${VERUS_RPC_HOST:-http://127.0.0.1:18843}"

echo -e "${BOLD}${CYAN}Verus Daemon Status Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if process is running
if pgrep -x "verusd" > /dev/null; then
    PID=$(pgrep -x "verusd")
    echo -e "${GREEN}✓ Process Running${NC} (PID: $PID)"
else
    echo -e "${RED}✗ Process Not Running${NC}"
    exit 1
fi

echo ""

# Try RPC call
echo -e "${BOLD}Testing RPC Connection...${NC}"
RESPONSE=$(curl -s --user "$RPC_USER:$RPC_PASSWORD" \
     --data-binary '{"jsonrpc":"2.0","id":"check","method":"getblockchaininfo","params":[]}' \
     -H 'content-type: application/json' \
     "$RPC_HOST" 2>/dev/null)

if echo "$RESPONSE" | grep -q "Work queue depth exceeded"; then
    echo -e "${RED}⚠ Work Queue Full${NC} - Daemon overloaded"
    echo -e "Consider restarting with higher rpcworkqueue setting"
elif echo "$RESPONSE" | grep -q "Loading block index"; then
    echo -e "${YELLOW}⟳ Loading Block Index${NC}"
    echo -e "The daemon is still initializing. This may take several minutes."
elif echo "$RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ RPC Ready${NC}"
    echo ""
    
    # Extract and display key info
    BLOCKS=$(echo "$RESPONSE" | jq -r '.result.blocks')
    HEADERS=$(echo "$RESPONSE" | jq -r '.result.headers')
    CHAIN=$(echo "$RESPONSE" | jq -r '.result.chain')
    PROGRESS=$(echo "$RESPONSE" | jq -r '.result.verificationprogress')
    
    echo -e "Chain:    ${CYAN}$CHAIN${NC}"
    echo -e "Blocks:   ${CYAN}$BLOCKS${NC} / ${CYAN}$HEADERS${NC}"
    echo -e "Progress: ${CYAN}$(awk "BEGIN {printf \"%.4f%%\", $PROGRESS*100}")${NC}"
    
    if [ "$BLOCKS" = "$HEADERS" ]; then
        echo -e "Status:   ${GREEN}${BOLD}✓ FULLY SYNCED${NC}"
    else
        BEHIND=$((HEADERS - BLOCKS))
        echo -e "Status:   ${YELLOW}⟳ Syncing ($BEHIND blocks behind)${NC}"
    fi
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error.message' 2>/dev/null)
    echo -e "${RED}✗ RPC Error${NC}"
    if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
        echo -e "Message: $ERROR"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}For continuous monitoring, run:${NC}"
echo -e "  ${BOLD}./scripts/monitor-verus-daemon.sh${NC}"

