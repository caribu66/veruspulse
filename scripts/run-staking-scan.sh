#!/bin/bash
###############################################################################
# Wrapper script to run staking history gatherer with correct environment
###############################################################################

cd "$(dirname "$0")/.."

# Load environment from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Display configuration
echo "==============================================="
echo "  Starting VerusID Staking History Gatherer"
echo "==============================================="
echo ""
echo "Configuration:"
echo "  RPC Host: $VERUS_RPC_HOST"
echo "  RPC User: $VERUS_RPC_USER"
echo "  Database: ${DATABASE_URL%@*}@..."
echo ""

# Run the Node.js script
exec node scripts/gather-staking-history.js




