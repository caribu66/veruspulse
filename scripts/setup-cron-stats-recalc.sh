#!/bin/bash
###############################################################################
# setup-cron-stats-recalc.sh
# Sets up cron-based automatic statistics recalculation
# 
# This script sets up a cron job that recalculates VerusID statistics
# at regular intervals using the system cron scheduler.
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CRON_SCRIPT="$SCRIPT_DIR/cron-recalc-stats.sh"

echo -e "${BLUE}🚀 Setting up Cron-based Statistics Auto-Recalculation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we're in the right directory
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: Not in the correct project directory${NC}"
    echo "Please run this script from the verus-dapp project root"
    exit 1
fi

# Create the cron script
echo -e "${YELLOW}📝 Creating cron execution script...${NC}"
cat > "$CRON_SCRIPT" << 'EOF'
#!/bin/bash
###############################################################################
# cron-recalc-stats.sh
# Cron-executable script for statistics recalculation
###############################################################################

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/cron-stats-recalc.log"
LOCK_FILE="$PROJECT_DIR/logs/cron-stats-recalc.lock"

# Ensure logs directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check for existing lock file
if [[ -f "$LOCK_FILE" ]]; then
    # Check if lock is stale (older than 2 hours)
    if [[ $(find "$LOCK_FILE" -mmin +120) ]]; then
        log "⚠️  Removing stale lock file"
        rm -f "$LOCK_FILE"
    else
        log "🔒 Another statistics recalculation is running, skipping..."
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

log "🔄 Starting scheduled statistics recalculation..."

# Change to project directory
cd "$PROJECT_DIR"

# Run the statistics recalculation
if ./scripts/recalculate-stats.sh >> "$LOG_FILE" 2>&1; then
    log "✅ Statistics recalculation completed successfully"
else
    log "❌ Statistics recalculation failed"
    exit 1
fi
EOF

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p "$PROJECT_DIR/logs"

# Make the main script executable
chmod +x "$SCRIPT_DIR/recalculate-stats.sh"

# Add cron job (every 30 minutes)
echo -e "${YELLOW}⏰ Adding cron job...${NC}"

# Remove any existing cron job for this script
(crontab -l 2>/dev/null | grep -v "cron-recalc-stats.sh" || true) | crontab -

# Add the new cron job
(crontab -l 2>/dev/null; echo "*/30 * * * * $CRON_SCRIPT") | crontab -

echo -e "${GREEN}✅ Cron job added successfully!${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Cron-based Auto-Recalculation Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  • Schedule: Every 30 minutes"
echo "  • Script: $CRON_SCRIPT"
echo "  • Log File: $PROJECT_DIR/logs/cron-stats-recalc.log"
echo "  • Lock File: $PROJECT_DIR/logs/cron-stats-recalc.lock"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  • View cron jobs:     crontab -l"
echo "  • Edit cron jobs:     crontab -e"
echo "  • Remove cron job:    crontab -e (then delete the line)"
echo "  • View logs:          tail -f $PROJECT_DIR/logs/cron-stats-recalc.log"
echo "  • Test manually:      $CRON_SCRIPT"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "  • Check recent runs:  grep 'Starting scheduled' $PROJECT_DIR/logs/cron-stats-recalc.log | tail -10"
echo "  • Check for errors:   grep 'failed' $PROJECT_DIR/logs/cron-stats-recalc.log | tail -5"
echo ""
echo -e "${GREEN}✨ The cron job will now automatically recalculate VerusID statistics${NC}"
echo -e "${GREEN}   every 30 minutes to keep your data fresh and up-to-date!${NC}"
