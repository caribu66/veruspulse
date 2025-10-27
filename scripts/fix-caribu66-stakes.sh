#!/bin/bash
###############################################################################
# FIX CARIBU66@ STAKING DATA
# 
# This script will:
# 1. Delete corrupted data (block_height = 0)
# 2. Perform a complete blockchain scan for caribu66@
# 3. Recalculate statistics
# 4. Verify the results
#
# Usage: ./fix-caribu66-stakes.sh
###############################################################################

set -e  # Exit on error

IADDR="iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB"
NAME="caribu66@"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     FIX CARIBU66@ STAKING DATA                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Target: $NAME"
echo "I-address: $IADDR"
echo ""
echo "⚠️  WARNING: This will delete existing data and rescan from scratch!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Backing up corrupted data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Export corrupted data to backup file
BACKUP_FILE="caribu66-corrupted-backup-$(date +%Y%m%d-%H%M%S).sql"
psql "${DATABASE_URL:-postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db}" -c "\COPY (SELECT * FROM staking_rewards WHERE identity_address = '$IADDR') TO '$BACKUP_FILE'"
echo "✓ Backup saved to: $BACKUP_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Deleting corrupted data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DELETED=$(psql "${DATABASE_URL:-postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db}" -t -c "DELETE FROM staking_rewards WHERE identity_address = '$IADDR' RETURNING 1;" | wc -l)
echo "✓ Deleted $DELETED corrupted records"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Running complete blockchain scan..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will scan the ENTIRE blockchain history (800,200 to current)"
echo "Estimated time: 2-6 hours depending on system"
echo ""

# Check if scan script exists
if [ ! -f "scripts/scan-single-verusid-complete.js" ]; then
    echo "❌ ERROR: scan-single-verusid-complete.js not found!"
    echo "Please ensure you're running this from the verus-dapp root directory"
    exit 1
fi

# Run the complete scan
node scripts/scan-single-verusid-complete.js "$IADDR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Recalculating statistics..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/calculate-verusid-statistics.js" ]; then
    node scripts/calculate-verusid-statistics.js "$IADDR"
else
    echo "⚠️  Warning: calculate-verusid-statistics.js not found"
    echo "You may need to run statistics calculation manually"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check results
psql "${DATABASE_URL:-postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db}" -c "
SELECT 
    COUNT(*) as total_stakes,
    MIN(DATE(block_time)) as first_stake,
    MAX(DATE(block_time)) as last_stake,
    COUNT(DISTINCT DATE(block_time)) as days_with_stakes,
    ROUND(SUM(amount_sats) / 100000000.0, 2) as total_rewards_vrsc,
    MIN(block_height) as first_block,
    MAX(block_height) as last_block
FROM staking_rewards 
WHERE identity_address = '$IADDR' 
  AND block_height > 0;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The staking calendar should now show ALL stakes correctly!"
echo ""
echo "Next steps:"
echo "1. Restart your application if running"
echo "2. Visit the VerusID page for caribu66@"
echo "3. The calendar should now display complete 5-year history"
echo ""

