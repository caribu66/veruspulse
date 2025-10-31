#!/bin/bash
# VerusPulse Cron Setup Script
# This script sets up continuous scanning with cron jobs

echo "🚀 Setting up VerusPulse Continuous Scanning..."

# Create necessary directories
mkdir -p /home/explorer/verus-dapp/logs
mkdir -p /home/explorer/verus-dapp/scripts

# Make scripts executable
chmod +x /home/explorer/verus-dapp/scripts/scanner-manager.sh

# Test the scanner manager
echo "🔍 Testing scanner manager..."
/home/explorer/verus-dapp/scripts/scanner-manager.sh status

# Show current cron jobs
echo ""
echo "📅 Current cron jobs:"
crontab -l

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Your cron jobs will:"
echo "  • Check scanners every 5 minutes"
echo "  • Run maintenance every hour"
echo "  • Update UTXO data every 6 hours"
echo ""
echo "🔍 Monitor with:"
echo "  tail -f /home/explorer/verus-dapp/logs/cron.log"
echo ""
echo "📊 Check status with:"
echo "  /home/explorer/verus-dapp/scripts/scanner-manager.sh status"
