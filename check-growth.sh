#!/bin/bash

echo "🔍 DATABASE GROWTH MONITOR"
echo "════════════════════════════════════════════════════════════"
echo ""

# Current stats
CURRENT_STAKES=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards WHERE identity_address LIKE 'i%'")
CURRENT_VERUSIDS=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(DISTINCT identity_address) FROM staking_rewards WHERE identity_address LIKE 'i%'")
CURRENT_CARIBU=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'")
LATEST_BLOCK=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards")
LATEST_TIME=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(block_time) FROM staking_rewards")

echo "📊 Current Status: $(date '+%Y-%m-%d %H:%M:%S')"
echo "────────────────────────────────────────────────────────"
echo "  Total VerusID Stakes:     $(echo $CURRENT_STAKES | xargs)"
echo "  Unique VerusIDs:          $(echo $CURRENT_VERUSIDS | xargs)"
echo "  Caribu66@ Stakes:         $(echo $CURRENT_CARIBU | xargs)"
echo "  Latest Block:             $(echo $LATEST_BLOCK | xargs)"
echo "  Latest Time:              $(echo $LATEST_TIME | xargs)"
echo ""

# Store in file for comparison
echo "$(date '+%Y-%m-%d %H:%M:%S'),$CURRENT_STAKES,$CURRENT_VERUSIDS,$CURRENT_CARIBU,$LATEST_BLOCK" >> db-growth-history.txt

echo "💾 Saved to db-growth-history.txt"
echo ""

# Show recent growth
if [ -f db-growth-history.txt ]; then
    echo "📈 Recent Growth (from history):"
    echo "────────────────────────────────────────────────────────"
    tail -5 db-growth-history.txt | awk -F',' '{print "  " $1 ": " $2 " stakes, " $3 " VerusIDs"}'
fi

echo ""
