#!/bin/bash
# Monitor ALL running scanners - stakes AND VerusID discovery

clear

while true; do
    clear
    
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Complete Scan Monitor (Stakes + Discovery)        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check scanner statuses
    echo "🔄 Scanner Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ps aux | grep -q "[s]can-verusids-full-history"; then
        echo "  ✅ Stake Scanner: RUNNING"
    else
        echo "  ❌ Stake Scanner: STOPPED"
    fi
    
    if ps aux | grep -q "[d]iscover-verusids-during-scan"; then
        echo "  ✅ VerusID Discovery: RUNNING"
    else
        echo "  ❌ VerusID Discovery: STOPPED"
    fi
    
    echo ""
    echo "📊 Stake Scanner Progress:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -30 /tmp/full-history-scan.log 2>/dev/null | grep -E "Progress:|Stakes:|Speed:|ETA:" | tail -4
    
    echo ""
    echo "🔍 VerusID Discovery Progress:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -20 /tmp/verusid-discovery.log 2>/dev/null | grep -E "Total VerusIDs|New discovered|Scanning blocks" | tail -3
    
    echo ""
    echo "💾 Database Totals:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    PGPASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}" psql -U "${POSTGRES_USER:-verus_user}" -d "${POSTGRES_DB:-verus_utxo_db}" -t << 'EOSQL' 2>/dev/null
SELECT 
    '  📝 VerusIDs: ' || COUNT(*)::text || 
    ' (Active: ' || COUNT(CASE WHEN last_refreshed_at > NOW() - INTERVAL '1 hour' THEN 1 END)::text || ')'
FROM identities WHERE identity_address LIKE 'i%'
UNION ALL
SELECT 
    '  🎯 Stakes: ' || COUNT(*)::text || 
    ' from ' || COUNT(DISTINCT identity_address)::text || ' VerusIDs'
FROM staking_rewards
UNION ALL
SELECT 
    '  💰 Total Rewards: ' || ROUND((SUM(amount_sats) / 100000000.0)::numeric, 2)::text || ' VRSC'
FROM staking_rewards;
EOSQL
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "Logs: tail -f /tmp/full-history-scan.log"
    echo "      tail -f /tmp/verusid-discovery.log"
    echo ""
    echo "Refreshing in 10 seconds... (Ctrl+C to exit)"
    
    sleep 10
done

