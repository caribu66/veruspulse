#!/bin/bash
# Monitor VerusID Staking History Scan Progress

echo "╔═══════════════════════════════════════════════╗"
echo "║   VerusID Staking History Scan Monitor       ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check if historical scan is running
if ps aux | grep -q "[s]can-verusids-historical-backfill.js"; then
    echo "✓ Historical backfill scan is RUNNING"
    echo ""
    
    # Show last progress update
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Latest Progress:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -5 /tmp/verusid-scan-historical.log | grep -A 4 "Progress:"
    echo ""
else
    echo "⚠ Historical scan is NOT running (may have completed or failed)"
    echo ""
    echo "Last 10 lines of log:"
    tail -10 /tmp/verusid-scan-historical.log
    echo ""
fi

# Database stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Current Database Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -t -c "
SELECT 
  '   VerusIDs in database: ' || (SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%')::text ||
  E'\n   VerusIDs with stakes: ' || COUNT(DISTINCT identity_address)::text ||
  E'\n   Total stakes recorded: ' || COUNT(*)::text ||
  E'\n   Total VRSC staked: ' || ROUND(SUM(amount_sats) / 100000000.0, 2)::text ||
  E'\n   Block range: ' || MIN(block_height)::text || ' to ' || MAX(block_height)::text ||
  E'\n   Latest stake: ' || MAX(block_time)::date::text
FROM staking_rewards;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this script anytime to check progress:"
echo "  bash scripts/monitor-verusid-scan.sh"
echo ""
echo "View detailed logs:"
echo "  tail -f /tmp/verusid-scan-historical.log"
echo ""


