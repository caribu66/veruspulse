#!/bin/bash
# Quick status checker for batch scan

echo "╔═══════════════════════════════════════════════╗"
echo "║      Batch Scan Status Checker                ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check if process is running
if ps aux | grep -q "[b]atch-fast-scan-all.js"; then
    echo "✓ Scanner is RUNNING"
    echo ""
    
    # Show last few lines of log
    echo "Recent progress:"
    tail -3 /tmp/batch-scan-*.log 2>/dev/null | grep "Progress:" | tail -1
    echo ""
else
    echo "⚠ Scanner is NOT running (may have completed or failed)"
    echo ""
fi

# Database stats
echo "📊 Database Statistics:"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -t -c "
SELECT 
  '   VerusIDs with stakes: ' || COUNT(DISTINCT identity_address)::text ||
  E'\n   Total stakes: ' || COUNT(*)::text ||
  E'\n   Total VRSC: ' || ROUND(SUM(amount_sats) / 100000000.0, 2)::text ||
  E'\n   Latest stake: ' || MAX(block_time)::date::text
FROM staking_rewards;
"

echo ""
echo "Run this script anytime to check status:"
echo "  bash scripts/check-scan-status.sh"
echo ""



