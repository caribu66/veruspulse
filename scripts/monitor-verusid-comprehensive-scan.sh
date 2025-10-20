#!/bin/bash
# Monitor the comprehensive VerusID staking scan progress

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     VerusID Comprehensive Scan Progress Monitor              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Database credentials
export PGPASSWORD=verus_secure_2024
DB_HOST="localhost"
DB_USER="verus_user"
DB_NAME="verus_utxo_db"

# Get current blockchain height
CURRENT_HEIGHT=$(curl -s --user verus:verus --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' -H 'content-type: text/plain;' http://192.168.86.89:18843/ | jq -r '.result')

# Get database statistics
DB_STATS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT 
  COUNT(*) as total_stakes,
  COUNT(DISTINCT identity_address) as unique_verusids,
  MAX(block_height) as latest_block,
  MIN(block_height) as earliest_block,
  ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
FROM staking_rewards
" | xargs)

# Parse results
IFS='|' read -r TOTAL_STAKES UNIQUE_VERUSIDS LATEST_BLOCK EARLIEST_BLOCK TOTAL_VRSC <<< "$DB_STATS"

# Get scan metadata
SCAN_PROGRESS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT scan_progress 
FROM scan_metadata 
WHERE scan_type = 'comprehensive_verusid_scan'
" | xargs)

# Calculate progress
START_BLOCK=800200
TOTAL_BLOCKS=$((CURRENT_HEIGHT - START_BLOCK))
SCANNED_BLOCKS=$((SCAN_PROGRESS - START_BLOCK))
PROGRESS_PERCENT=$(echo "scale=2; ($SCANNED_BLOCKS / $TOTAL_BLOCKS) * 100" | bc)

# Calculate remaining
REMAINING_BLOCKS=$((CURRENT_HEIGHT - SCAN_PROGRESS))

echo "📊 Scan Progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Current blockchain height: $(printf "%'d" $CURRENT_HEIGHT)"
echo "  Last scanned block:        $(printf "%'d" $SCAN_PROGRESS)"
echo "  Blocks scanned:            $(printf "%'d" $SCANNED_BLOCKS) / $(printf "%'d" $TOTAL_BLOCKS)"
echo "  Progress:                  $PROGRESS_PERCENT%"
echo "  Remaining blocks:          $(printf "%'d" $REMAINING_BLOCKS)"
echo ""

echo "📈 Data Collected"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total stake events:        $(printf "%'d" ${TOTAL_STAKES:-0})"
echo "  Unique VerusIDs staking:   $(printf "%'d" ${UNIQUE_VERUSIDS:-0})"
echo "  Total VRSC staked:         ${TOTAL_VRSC:-0} VRSC"
echo "  Block range:               $(printf "%'d" ${EARLIEST_BLOCK:-0}) - $(printf "%'d" ${LATEST_BLOCK:-0})"
echo ""

# Check if scan is running
SCAN_PID=$(ps aux | grep "scan-all-verusids-comprehensive.js" | grep -v grep | awk '{print $2}')
if [ -n "$SCAN_PID" ]; then
    echo "✅ Scan is RUNNING (PID: $SCAN_PID)"
    
    # Get latest log file
    LATEST_LOG=$(ls -t logs/verusid-sync-*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo ""
        echo "📝 Latest Log Output:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -20 "$LATEST_LOG"
    fi
else
    echo "❌ Scan is NOT RUNNING"
    echo ""
    echo "To restart the scan, run:"
    echo "  cd /home/explorer/verus-dapp"
    echo "  ./start-verusid-sync.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Monitor commands:"
echo "  Watch this monitor:  watch -n 5 ./scripts/monitor-verusid-comprehensive-scan.sh"
echo "  View live logs:      tail -f logs/verusid-sync-*.log"
echo "  Stop scan:           kill $SCAN_PID"
echo ""



