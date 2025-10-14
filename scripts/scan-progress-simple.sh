#!/bin/bash
# Simple one-shot progress check (no loop)

SCAN_LOG="/tmp/full-history-scan.log"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         VerusID Full History Scan Progress                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Scanner status
if ps aux | grep -q "[s]can-verusids-full-history"; then
    echo "🟢 Scanner: RUNNING"
    echo ""
    echo "Latest Progress:"
    tail -30 "$SCAN_LOG" | grep -A3 "Progress:" | tail -4
else
    echo "🔴 Scanner: NOT RUNNING"
fi

echo ""
echo "Database Stats:"
PGPASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}" psql -U "${POSTGRES_USER:-verus_user}" -d "${POSTGRES_DB:-verus_utxo_db}" -c "
SELECT 
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as verusids,
    ROUND((SUM(amount_sats) / 100000000.0)::numeric, 2) as total_vrsc,
    MAX(block_height) as latest_block
FROM staking_rewards;" 2>/dev/null

echo ""
echo "Monitor live: ./scripts/monitor-full-scan.sh"

