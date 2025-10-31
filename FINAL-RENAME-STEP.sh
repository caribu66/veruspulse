#!/bin/bash
# Final step to rename database
# Run this script with: bash FINAL-RENAME-STEP.sh

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Database Rename: verus_utxo_db → pos_db                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Rename database
echo "🔄 Renaming database..."
sudo -u postgres psql -c "ALTER DATABASE verus_utxo_db RENAME TO pos_db;"

if [ $? -eq 0 ]; then
    echo "✅ Database renamed successfully!"
    echo ""
    
    # Verify
    echo "📊 Verifying..."
    sudo -u postgres psql -c "\l" | grep pos_db
    echo ""
    
    # Start services
    echo "🚀 Starting services..."
    cd /home/explorer/verus-dapp
    pm2 start veruspulse
    
    echo ""
    echo "✅ All done! Database renamed to pos_db"
    echo ""
    echo "Test it:"
    echo "  curl http://localhost:3000/api/health | jq ."
else
    echo "❌ Failed to rename database"
    echo "You may need to run: sudo -u postgres psql"
    echo "Then manually: ALTER DATABASE verus_utxo_db RENAME TO pos_db;"
fi

