#!/bin/bash
# VerusPulse Oink's Method Complete Setup
# This script sets up Oink's efficient scanning methods with autonomous management

echo "🤖 Setting up VerusPulse Oink's Method Autonomous Scanner System..."
echo "=================================================================="

# Configuration
SCRIPT_DIR="/home/explorer/verus-dapp"
LOG_DIR="$SCRIPT_DIR/logs"

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$SCRIPT_DIR/public"

# Make scripts executable
chmod +x "$SCRIPT_DIR/scripts/oink-autonomous-scanner.sh"
chmod +x "$SCRIPT_DIR/scripts/generate-dashboard.sh"

echo ""
echo "🔧 Setting up Oink's method cron jobs..."

# Remove old scanner management cron jobs
crontab -l 2>/dev/null | grep -v "scanner-manager.sh" | grep -v "autonomous-scanner.sh" | crontab -

# Add Oink's method autonomous scanner cron jobs
(crontab -l 2>/dev/null; echo ""; echo "# VerusPulse Oink's Method Autonomous Scanner System"; echo "*/2 * * * * $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh manage >> $LOG_DIR/oink-autonomous-cron.log 2>&1"; echo "0 */6 * * * $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh health >> $LOG_DIR/oink-health-reports.log 2>&1"; echo "0 3 * * 0 $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh emergency >> $LOG_DIR/oink-weekly-recovery.log 2>&1"; echo "*/30 * * * * $SCRIPT_DIR/scripts/generate-dashboard.sh >> $LOG_DIR/dashboard-updates.log 2>&1") | crontab -

echo "✅ Oink's method cron jobs configured"

echo ""
echo "🚀 Testing Oink's method autonomous system..."

# Test the Oink's method autonomous scanner
"$SCRIPT_DIR/scripts/oink-autonomous-scanner.sh" status

echo ""
echo "📊 Generating monitoring dashboard..."
"$SCRIPT_DIR/scripts/generate-dashboard.sh"

echo ""
echo "🎉 Oink's Method Setup Complete!"
echo "================================"
echo ""
echo "🤖 Your VerusPulse scanner system now uses Oink's efficient methods:"
echo ""
echo "✅ I-Address Staking Rule: Only direct I-address stakes counted"
echo "✅ PoS Pre-filtering: Only scans PoS blocks, skips PoW blocks"
echo "✅ Ultra-fast Processing: 10+ VerusIDs in parallel"
echo "✅ Hybrid Approach: getaddressutxos + smart stake scanning"
echo "✅ Batch Operations: Efficient database operations"
echo "✅ Automatic scanner management every 2 minutes"
echo "✅ Health reports every 6 hours"
echo "✅ Emergency recovery every Sunday at 3 AM"
echo "✅ Dashboard updates every 30 minutes"
echo "✅ Self-healing with exponential backoff"
echo "✅ Automatic restart on failures"
echo "✅ Log cleanup and maintenance"
echo ""
echo "📊 Monitor your Oink's method system:"
echo "  • Dashboard: http://localhost:3000/scanner-dashboard.html"
echo "  • Status: $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh status"
echo "  • Health: $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh health"
echo "  • Logs: tail -f $LOG_DIR/oink-autonomous-cron.log"
echo ""
echo "🛠️ Management commands:"
echo "  • Emergency recovery: $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh emergency"
echo "  • Manual management: $SCRIPT_DIR/scripts/oink-autonomous-scanner.sh manage"
echo ""
echo "🎯 The system will now run using Oink's efficient methods!"
echo "   No manual monitoring required - it's self-healing!"
