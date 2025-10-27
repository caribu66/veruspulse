#!/bin/bash
echo "🔍 Monitoring staking data scan progress..."
echo ""

while true; do
    CURRENT_BLOCK=$(/home/explorer/verus-cli/verus getblockchaininfo | grep '"blocks"' | sed 's/.*: *//' | sed 's/,//')
    
    # Check database status
    DB_STATUS=$(curl -s http://localhost:3000/api/verusid/staking-overview 2>/dev/null || echo "{}")
    
    echo "📊 Current Status:"
    echo "   Blockchain tip: Block $CURRENT_BLOCK"
    echo "   Database status: $(echo $DB_STATUS | jq -r '.totalStakes // "Checking..."' 2>/dev/null || echo "Scanning...")"
    echo "   Time: $(date)"
    echo ""
    
    sleep 30
done
