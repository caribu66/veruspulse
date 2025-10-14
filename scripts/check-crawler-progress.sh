#!/bin/bash
# Quick script to check VerusID crawler progress

cd /home/explorer/verus-dapp

echo "===================================================="
echo "  VerusID Crawler Progress"
echo "===================================================="
echo ""

# Check if crawler is running
if ps aux | grep -q "[p]opulate-verusids.js"; then
    echo "✅ Crawler is RUNNING"
else
    echo "⚠️  Crawler is NOT running"
fi

echo ""
echo "Database Statistics:"
echo "----------------------------------------------------"

# Get database stats
PGPASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}" psql -U "${POSTGRES_USER:-verus_user}" \
  -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" \
  -d "${POSTGRES_DB:-verus_utxo_db}" << 'EOF'
SELECT 
  COUNT(*) as "Total VerusIDs",
  COUNT(CASE WHEN last_refreshed_at > NOW() - INTERVAL '5 minutes' THEN 1 END) as "Added (last 5 min)",
  COUNT(CASE WHEN last_refreshed_at > NOW() - INTERVAL '1 hour' THEN 1 END) as "Added (last hour)"
FROM identities 
WHERE identity_address LIKE 'i%';
EOF

echo ""
echo "Recent VerusIDs found:"
echo "----------------------------------------------------"

PGPASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}" psql -U "${POSTGRES_USER:-verus_user}" \
  -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" \
  -d "${POSTGRES_DB:-verus_utxo_db}" << 'EOF'
SELECT 
  identity_address,
  COALESCE(base_name, 'unknown') as name,
  last_refreshed_at
FROM identities 
WHERE identity_address LIKE 'i%'
ORDER BY last_refreshed_at DESC
LIMIT 10;
EOF

echo ""
echo "To stop the crawler: pkill -f populate-verusids"
echo "To view live output: tail -f (check logs)"
echo "===================================================="

