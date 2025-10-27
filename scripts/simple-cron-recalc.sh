#!/bin/bash
# Simple cron script for statistics recalculation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/simple-cron-recalc.log"
LOCK_FILE="$PROJECT_DIR/logs/simple-cron-recalc.lock"

# Ensure logs directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check for existing lock file
if [[ -f "$LOCK_FILE" ]]; then
    # Check if lock is stale (older than 2 hours)
    if [[ $(find "$LOCK_FILE" -mmin +120 2>/dev/null) ]]; then
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
