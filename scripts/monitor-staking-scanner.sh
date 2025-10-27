#!/bin/bash

# Monitor Standalone Verus Staking Scanner
# Shows current progress and statistics

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Standalone Staking Scanner Monitor                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if scanner is running
if [ -f "/tmp/standalone-staking-scanner.pid" ]; then
    PID=$(cat /tmp/standalone-staking-scanner.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Scanner is RUNNING (PID: $PID)"
        echo ""
        
        # Show process info
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📊 Process Information:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        ps -p $PID -o pid,ppid,cmd,etime,pcpu,pmem 2>/dev/null | tail -n +2 | sed 's/^/   /'
        echo ""
    else
        echo "⚠️  Scanner is NOT running (stale PID file)"
        rm -f /tmp/standalone-staking-scanner.pid
    fi
else
    echo "⚠️  Scanner is NOT running (no PID file)"
fi

# Show recent log activity
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Recent Activity:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "/tmp/standalone-staking-scanner.log" ]; then
    echo "Last 10 log entries:"
    tail -10 /tmp/standalone-staking-scanner.log | sed 's/^/   /'
else
    echo "   No log file found"
fi
echo ""

# Database statistics
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Current Database Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
SELECT 
  '   Total VerusIDs: ' || (SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%')::text ||
  E'\n   VerusIDs with stakes: ' || COUNT(DISTINCT identity_address)::text ||
  E'\n   Total stake events: ' || COUNT(*)::text ||
  E'\n   Total VRSC staked: ' || ROUND(SUM(amount_sats) / 100000000.0, 2)::text ||
  E'\n   Block range: ' || MIN(block_height)::text || ' → ' || MAX(block_height)::text ||
  E'\n   Latest stake: ' || MAX(block_time)::date::text
FROM staking_rewards;
" 2>/dev/null || echo "   Database connection failed"

# Scan progress from metadata
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Saved Progress:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "
SELECT 
  '   Last saved block: ' || scan_progress::text ||
  E'\n   Last updated: ' || last_updated::timestamptz::text
FROM scan_metadata 
WHERE scan_type = 'standalone_staking_scan'
LIMIT 1;
" 2>/dev/null || echo "   No progress saved yet"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Commands:"
echo "  • Start scanner: bash scripts/start-staking-scanner.sh"
echo "  • Monitor logs: tail -f /tmp/standalone-staking-scanner.log"
echo "  • Stop scanner: kill \$(cat /tmp/standalone-staking-scanner.pid)"
echo "  • View full log: cat /tmp/standalone-staking-scanner.log"
echo ""








