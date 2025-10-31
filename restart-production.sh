#!/bin/bash
# VerusPulse Production Restart Script

echo "🔄 Restarting VerusPulse..."
cd /home/explorer/verus-dapp

# Rebuild
echo "🔨 Building..."
NODE_ENV=production npm run build

# Restart PM2
echo "🚀 Restarting..."
pm2 restart veruspulse --update-env
pm2 save

# Wait and verify
sleep 5
echo ""
echo "✅ Restart complete!"
echo ""
echo "Health: $(curl -s http://localhost:3000/api/health 2>/dev/null | jq -r '.data.overall' 2>/dev/null || echo 'checking...')"
pm2 status
