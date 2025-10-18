#!/bin/bash
###############################################################################
# Persistent Staking History Scanner
# Waits for daemon and runs continuously
###############################################################################

cd "$(dirname "$0")/.."

LOG_FILE="logs/staking-scan.log"
echo "╔═══════════════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
echo "║     Persistent VerusID Staking History Scanner       ║" | tee -a "$LOG_FILE"
echo "╚═══════════════════════════════════════════════════════╝" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Wait for daemon to be ready (infinite loop)
echo "⏳ Waiting for Verus daemon to be ready..." | tee -a "$LOG_FILE"
attempt=0
while true; do
  attempt=$((attempt + 1))
  
  # Test RPC connection
  result=$(curl -s --max-time 5 --user verus:verus \
    --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
    -H 'content-type: text/plain;' \
    http://192.168.86.89:18843/ 2>&1)
  
  if echo "$result" | grep -q '"result"'; then
    echo "✅ Daemon is ready!" | tee -a "$LOG_FILE"
    break
  fi
  
  echo "   Attempt $attempt: Daemon still loading... (waiting 30s)" | tee -a "$LOG_FILE"
  sleep 30
done

echo "" | tee -a "$LOG_FILE"
echo "🚀 Starting staking history gatherer..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Run the Node.js scanner
exec node scripts/gather-staking-history.js 2>&1 | tee -a "$LOG_FILE"




