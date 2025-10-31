#!/bin/bash
# VerusPulse Production Shutdown Script

echo "🛑 Stopping VerusPulse..."
cd /home/explorer/verus-dapp

pm2 stop veruspulse
pm2 save

echo "✅ Production stopped gracefully"
pm2 status
