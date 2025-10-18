#!/bin/bash
# Quick sync status checker

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           VerusID Sync Status - Live Monitor                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check process status
echo "🔄 Process Status:"
if kill -0 120064 2>/dev/null; then
    echo "  ✅ Staking Scanner: RUNNING (PID 120064)"
else
    echo "  ❌ Staking Scanner: STOPPED"
fi

if kill -0 122029 2>/dev/null; then
    echo "  ✅ UTXO Auto-Update: RUNNING (PID 122029)"
else
    echo "  ❌ UTXO Auto-Update: STOPPED"
fi
echo ""

# Database stats
echo "📊 Database Statistics:"
export PGPASSWORD=verus_secure_2024
REWARDS=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards" 2>/dev/null | xargs)
STATS=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM verusid_statistics" 2>/dev/null | xargs)
echo "  • Staking Rewards: $REWARDS"
echo "  • VerusID Statistics: $STATS"
echo ""

# Scan progress
echo "📈 Scan Progress:"
PROGRESS=$(psql -h localhost -U verus_user -d verus_utxo_db -t -c "SELECT scan_progress FROM scan_metadata WHERE scan_type = 'comprehensive_verusid_scan'" 2>/dev/null | xargs)
echo "  • Last Block Scanned: $PROGRESS"
echo ""

# Latest log lines
echo "📝 Latest Progress (from logs):"
tail -10 logs/verusid-sync-*.log 2>/dev/null | grep -E "(Progress|Stakes found|Speed|ETA)" | tail -5
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 View full logs: tail -f logs/verusid-sync-*.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
