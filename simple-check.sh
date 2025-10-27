#!/bin/bash
echo "Quick Database Check:"
echo "===================="
echo ""
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT 
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as unique_verusids
FROM staking_rewards 
WHERE identity_address LIKE 'i%'
"
echo ""
echo "Caribu66@ stakes:"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT COUNT(*) as stakes, MAX(block_height) as latest_block 
FROM staking_rewards 
WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
"
echo ""
echo "✅ Done! Run this anytime with: ./simple-check.sh"
