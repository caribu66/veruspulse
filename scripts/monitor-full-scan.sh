#!/bin/bash
# Live monitor for full history scan

SCAN_LOG="/tmp/full-history-scan.log"
DB_PASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}"
DB_USER="${POSTGRES_USER:-verus_user}"
DB_NAME="${POSTGRES_DB:-verus_utxo_db}"

clear

while true; do
    clear
    
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         VerusID Full History Scan Monitor                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check if scanner is running
    if ps aux | grep -q "[s]can-verusids-full-history"; then
        echo "🟢 Scanner Status: RUNNING"
    else
        echo "🔴 Scanner Status: NOT RUNNING"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 LIVE PROGRESS FROM LOG"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get latest progress from log
    if [ -f "$SCAN_LOG" ]; then
        tail -20 "$SCAN_LOG" | grep -E "Progress:|Stakes:|Speed:|ETA:" | tail -4
    else
        echo "⚠️  Log file not found: $SCAN_LOG"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💾 DATABASE STATISTICS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get database stats
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F$'\t' << 'EOSQL' 2>/dev/null
SELECT 
    '📈 Total Stakes: ' || COUNT(*)::text,
    '👥 VerusIDs: ' || COUNT(DISTINCT identity_address)::text,
    '💰 Total Rewards: ' || ROUND((SUM(amount_sats) / 100000000.0)::numeric, 2)::text || ' VRSC',
    '🔢 Block Range: ' || MIN(block_height)::text || ' - ' || MAX(block_height)::text
FROM staking_rewards;
EOSQL
    
    echo ""
    
    # Get stats count
    STATS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM verusid_statistics;" 2>/dev/null)
    echo "📊 Statistics Calculated: $STATS_COUNT VerusIDs"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏆 TOP 5 STAKERS (Current Data)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" << 'EOSQL' 2>/dev/null
SELECT 
    RPAD(COALESCE(SUBSTRING(vs.friendly_name, 1, 25), 'unknown'), 26, ' ') as "Name",
    LPAD(vs.total_stakes::text, 6, ' ') as "Stakes",
    LPAD(ROUND((vs.total_rewards_satoshis / 100000000.0)::numeric, 2)::text, 10, ' ') as "VRSC"
FROM verusid_statistics vs
ORDER BY vs.total_stakes DESC
LIMIT 5;
EOSQL
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⏰ Last Updated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "Commands:"
    echo "  [Ctrl+C] - Exit monitor"
    echo "  View log: tail -f $SCAN_LOG"
    echo "  Recalc stats: ./scripts/recalculate-stats.sh"
    echo ""
    echo "Refreshing in 5 seconds..."
    
    sleep 5
done

