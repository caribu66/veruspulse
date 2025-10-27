#!/bin/bash

echo "🔍 Checking Staking Data Progress..."
echo ""

# Wait for app to start
sleep 5

# Check blockchain height
echo "📊 Current blockchain height:"
/home/explorer/verus-cli/verus getblockcount
echo ""

# Check database directly using the working approach
echo "📊 Checking database directly..."
echo "SELECT COUNT(*) as total_stakes, MAX(block_height) as latest_block FROM staking_rewards;" | PGPASSWORD=yourpassword psql -h localhost -U postgres -d verus_utxo_db 2>/dev/null || echo "Database check failed"
echo ""

echo "💡 If you see numbers above, your staking data is being updated!"
echo "💡 The higher the latest_block number, the more recent your data is."











