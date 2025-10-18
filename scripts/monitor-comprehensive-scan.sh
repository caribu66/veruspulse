#!/bin/bash
# Monitor Comprehensive VerusID Staking Scan

echo "╔═══════════════════════════════════════════════╗"
echo "║   Comprehensive VerusID Scan Monitor         ║"
echo "║   Scanning ALL 32,990 VerusIDs               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check if scan is running
if ps aux | grep -q "[s]can-all-verusids-comprehensive.js"; then
    echo "✅ Comprehensive scan is RUNNING"
    echo ""
    
    # Show latest progress
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Latest Progress:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -10 /tmp/comprehensive-verusid-scan.log | grep -A 6 "Progress:" | head -7
    echo ""
else
    echo "⚠️  Comprehensive scan is NOT running"
    echo ""
    echo "Last 15 lines of log:"
    tail -15 /tmp/comprehensive-verusid-scan.log
    echo ""
fi

# Database stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Current Database Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -t -c "
SELECT 
  '   Total VerusIDs: ' || (SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%')::text ||
  E'\n   VerusIDs with stakes: ' || COUNT(DISTINCT identity_address)::text ||
  E'\n   Total stake events: ' || COUNT(*)::text ||
  E'\n   Total VRSC staked: ' || ROUND(SUM(amount_sats) / 100000000.0, 2)::text ||
  E'\n   Block range: ' || MIN(block_height)::text || ' → ' || MAX(block_height)::text ||
  E'\n   Latest stake: ' || MAX(block_time)::date::text
FROM staking_rewards;
"

# Scan progress from metadata
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Saved Progress:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -t -c "
SELECT 
  '   Last saved block: ' || scan_progress::text ||
  E'\n   Last updated: ' || last_updated::timestamptz::text
FROM scan_metadata 
WHERE scan_type = 'comprehensive_verusid_scan'
LIMIT 1;
" 2>/dev/null || echo "   No progress saved yet"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Commands:"
echo "  • Monitor: bash scripts/monitor-comprehensive-scan.sh"
echo "  • View log: tail -f /tmp/comprehensive-verusid-scan.log"
echo "  • Stop scan: pkill -f scan-all-verusids-comprehensive"
echo ""


