#!/bin/bash
# Quick scanner status check

echo "╔════════════════════════════════════════════════╗"
echo "║     VerusID Mass Scanner Status               ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

curl -s http://localhost:3000/api/admin/mass-scan | jq -r '
if .isRunning then
  "🟢 Status: RUNNING
  
📊 Progress:
   Phase: \(.progress.currentPhase)
   VerusIDs: \(.progress.addressesProcessed)/\(.progress.totalAddresses)
   Blocks: \(.progress.blocksProcessed)/\(.progress.totalBlocks)
   Stakes Found: \(.progress.stakeEventsFound)
   Elapsed: \(.progress.elapsedTime)
   Errors: \(.progress.errors)

💾 Cache:
   Hits: \(.progress.cacheHits)
   Misses: \(.progress.cacheMisses)
"
else
  "🔴 Status: NOT RUNNING"
end
'

echo ""
echo "Monitor live: watch -n 2 './scripts/quick-scan-status.sh'"
echo "Full monitor: ./scripts/monitor-scan.sh"
echo "════════════════════════════════════════════════"

