#!/bin/bash
###############################################################################
# blocknotify.sh
# Real-time blockchain notification handler
# 
# Usage: verusd -blocknotify=/path/to/blocknotify.sh %s
# 
# This script is called by verusd whenever a new block is found.
# It triggers various monitoring and update tasks.
#
# Inspired by Oink70's blocknotify.sh
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/blocknotify.log"
NEXT_API="http://localhost:3000"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Input: block hash or block height
BLOCK_INPUT="${1:-}"

if [ -z "$BLOCK_INPUT" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: No block hash or height provided" >> "$LOG_FILE"
  exit 1
fi

# Log the notification
echo "[$(date '+%Y-%m-%d %H:%M:%S')] New block: $BLOCK_INPUT" >> "$LOG_FILE"

# List of scripts to execute on new block
# Add your custom monitoring scripts here
MONITOR_SCRIPTS=(
  # "$SCRIPT_DIR/monitor-VerusID.sh"
  # "$SCRIPT_DIR/monitor-addresses.sh"
  # Add more as needed
)

# Execute each monitoring script in background
for script in "${MONITOR_SCRIPTS[@]}"; do
  if [ -f "$script" ] && [ -x "$script" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Executing: $script $BLOCK_INPUT" >> "$LOG_FILE"
    "$script" "$BLOCK_INPUT" >> "$LOG_FILE" 2>&1 &
  fi
done

# Notify Next.js API (for WebSocket broadcasting)
if command -v curl &> /dev/null; then
  curl -s -X POST "$NEXT_API/api/webhook/new-block" \
    -H "Content-Type: application/json" \
    -d "{\"block\":\"$BLOCK_INPUT\"}" \
    >> "$LOG_FILE" 2>&1 &
fi

# Optional: Trigger cache refresh
# curl -s -X POST "$NEXT_API/api/cache/refresh" >> "$LOG_FILE" 2>&1 &

# Exit immediately (don't wait for background jobs)
exit 0





