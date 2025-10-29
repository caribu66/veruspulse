#!/bin/bash

# Setup script to run update-last-stake-time.js on a schedule

PROJECT_DIR="/home/explorer/verus-dapp"
SCRIPT_DIR="$PROJECT_DIR/scripts"
CRON_SCRIPT="$SCRIPT_DIR/cron-update-last-stake.sh"
LOG_FILE="$PROJECT_DIR/logs/last-stake-update.log"
LOCK_FILE="$PROJECT_DIR/logs/last-stake-update.lock"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Setting up automatic last-stake-time updates..."

# Create cron script
cat > "$CRON_SCRIPT" << 'EOF'
#!/bin/bash

PROJECT_DIR="/home/explorer/verus-dapp"
LOG_FILE="$PROJECT_DIR/logs/last-stake-update.log"
LOCK_FILE="$PROJECT_DIR/logs/last-stake-update.lock"

# Check for existing lock file
if [[ -f "$LOCK_FILE" ]]; then
    # Check if lock is stale (older than 30 minutes)
    if [[ $(find "$LOCK_FILE" -mmin +30) ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  Removing stale lock file" | tee -a "$LOG_FILE"
        rm -f "$LOCK_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔒 Update already running, skipping..." | tee -a "$LOG_FILE"
        exit 0
    fi
fi

# Create lock file
echo "$$" > "$LOCK_FILE"

# Function to cleanup on exit
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Starting last stake time update..." | tee -a "$LOG_FILE"

# Change to project directory
cd "$PROJECT_DIR"

# Run the update
if node scripts/update-last-stake-time.js >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Update completed successfully" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Update failed" | tee -a "$LOG_FILE"
    exit 1
fi
EOF

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p "$PROJECT_DIR/logs"

# Add cron job (every 15 minutes)
echo -e "${YELLOW}⏰ Adding cron job...${NC}"

# Remove any existing cron job for this script
(crontab -l 2>/dev/null | grep -v "cron-update-last-stake.sh" || true) | crontab -

# Add the new cron job
(crontab -l 2>/dev/null; echo "*/15 * * * * $CRON_SCRIPT") | crontab -

echo -e "${GREEN}✅ Setup complete!${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Automatic Last Stake Time Updates Configured!${NC}"
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  • Schedule: Every 15 minutes"
echo "  • Script: $CRON_SCRIPT"
echo "  • Log File: $LOG_FILE"
echo ""
echo -e "${YELLOW}💡 To test immediately:${NC}"
echo "  node scripts/update-last-stake-time.js"
echo ""
echo -e "${YELLOW}📝 View logs:${NC}"
echo "  tail -f logs/last-stake-update.log"
echo ""
echo -e "${YELLOW}⏹️  To disable:${NC}"
echo "  crontab -e  # Then remove the line with cron-update-last-stake.sh"

