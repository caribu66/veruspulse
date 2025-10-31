#!/bin/bash
# VerusPulse Complete Autonomous Setup
# This script sets up a fully autonomous blockchain scanning system

echo "🤖 Setting up VerusPulse Autonomous Scanner System..."
echo "=================================================="

# Configuration
SCRIPT_DIR="/home/explorer/verus-dapp"
LOG_DIR="$SCRIPT_DIR/logs"

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$SCRIPT_DIR/public"

# Make scripts executable
chmod +x "$SCRIPT_DIR/scripts/autonomous-scanner.sh"
chmod +x "$SCRIPT_DIR/scripts/generate-dashboard.sh"

echo ""
echo "🔧 Setting up autonomous cron jobs..."

# Remove old scanner management cron jobs
crontab -l 2>/dev/null | grep -v "scanner-manager.sh" | crontab -

# Add autonomous scanner cron jobs
(crontab -l 2>/dev/null; echo ""; echo "# VerusPulse Autonomous Scanner System"; echo "*/2 * * * * $SCRIPT_DIR/scripts/autonomous-scanner.sh manage >> $LOG_DIR/autonomous-cron.log 2>&1"; echo "0 */6 * * * $SCRIPT_DIR/scripts/autonomous-scanner.sh health >> $LOG_DIR/health-reports.log 2>&1"; echo "0 3 * * 0 $SCRIPT_DIR/scripts/autonomous-scanner.sh emergency >> $LOG_DIR/weekly-recovery.log 2>&1"; echo "*/30 * * * * $SCRIPT_DIR/scripts/generate-dashboard.sh >> $LOG_DIR/dashboard-updates.log 2>&1") | crontab -

echo "✅ Cron jobs configured"

echo ""
echo "🚀 Testing autonomous system..."

# Test the autonomous scanner
"$SCRIPT_DIR/scripts/autonomous-scanner.sh" status

echo ""
echo "📊 Generating monitoring dashboard..."
"$SCRIPT_DIR/scripts/generate-dashboard.sh"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🤖 Your VerusPulse scanner system is now fully autonomous:"
echo ""
echo "✅ Automatic scanner management every 2 minutes"
echo "✅ Health reports every 6 hours"
echo "✅ Emergency recovery every Sunday at 3 AM"
echo "✅ Dashboard updates every 30 minutes"
echo "✅ Self-healing with exponential backoff"
echo "✅ Automatic restart on failures"
echo "✅ Log cleanup and maintenance"
echo ""
echo "📊 Monitor your system:"
echo "  • Dashboard: http://localhost:3000/scanner-dashboard.html"
echo "  • Status: $SCRIPT_DIR/scripts/autonomous-scanner.sh status"
echo "  • Health: $SCRIPT_DIR/scripts/autonomous-scanner.sh health"
echo "  • Logs: tail -f $LOG_DIR/autonomous-cron.log"
echo ""
echo "🛠️ Management commands:"
echo "  • Emergency recovery: $SCRIPT_DIR/scripts/autonomous-scanner.sh emergency"
echo "  • Manual management: $SCRIPT_DIR/scripts/autonomous-scanner.sh manage"
echo ""
echo "🎯 The system will now run completely autonomously!"
echo "   No manual monitoring required - it's self-healing!"
