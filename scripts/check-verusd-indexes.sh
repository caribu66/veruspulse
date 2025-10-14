#!/bin/bash
# Check if verusd has required indexes enabled

set -e

echo "🔍 Checking verusd configuration..."

# Load RPC config from env
source .env 2>/dev/null || true

RPC_URL=${VERUS_RPC_HOST:-http://127.0.0.1:27486}
RPC_USER=${VERUS_RPC_USER:-verus}
RPC_PASS=${VERUS_RPC_PASSWORD:-verus}

# Test RPC connection
echo "Testing RPC connection to $RPC_URL..."
RESULT=$(curl -s -u "$RPC_USER:$RPC_PASS" -X POST "$RPC_URL" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[],"id":"test"}')

if echo "$RESULT" | grep -q '"error"'; then
  echo "❌ RPC connection failed:"
  echo "$RESULT" | grep -o '"message":"[^"]*"'
  exit 1
fi

echo "✅ RPC connection successful"

# Check addressindex
echo ""
echo "Checking addressindex..."
TEST_ADDR=$(curl -s -u "$RPC_USER:$RPC_PASS" -X POST "$RPC_URL" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"1.0","method":"getaddresstxids","params":[{"addresses":["RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR"],"start":1,"end":100}],"id":"test"}' 2>&1)

if echo "$TEST_ADDR" | grep -q "Address index not enabled"; then
  echo "❌ addressindex is NOT enabled"
  echo ""
  echo "⚠️  You must restart verusd with -addressindex=1 -txindex=1"
  echo ""
  echo "Add to verus.conf:"
  echo "  addressindex=1"
  echo "  txindex=1"
  echo "  spentindex=1"
  echo ""
  echo "Then restart: verusd -reindex"
  echo ""
  echo "⏰ Note: Reindexing can take several hours"
  exit 1
elif echo "$TEST_ADDR" | grep -q '"result"'; then
  echo "✅ addressindex is enabled"
else
  echo "⚠️  Could not verify addressindex (unexpected response)"
  echo "$TEST_ADDR"
fi

# Check txindex
echo ""
echo "Checking txindex..."
GENESIS_TX="4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
TEST_TX=$(curl -s -u "$RPC_USER:$RPC_PASS" -X POST "$RPC_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"1.0\",\"method\":\"getrawtransaction\",\"params\":[\"$GENESIS_TX\",1],\"id\":\"test\"}" 2>&1)

if echo "$TEST_TX" | grep -q "No such mempool or blockchain transaction"; then
  echo "❌ txindex is NOT enabled or not synced"
  echo ""
  echo "Add to verus.conf:"
  echo "  txindex=1"
  echo ""
  echo "Then restart: verusd -reindex"
  exit 1
elif echo "$TEST_TX" | grep -q '"result"'; then
  echo "✅ txindex is enabled"
else
  echo "⚠️  Could not verify txindex (may not be synced yet)"
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   ✅ verusd is properly configured!        ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Chain info:"
CHAIN=$(echo "$RESULT" | grep -o '"chain":"[^"]*"' | cut -d'"' -f4)
BLOCKS=$(echo "$RESULT" | grep -o '"blocks":[0-9]*' | cut -d':' -f2)
echo "  Chain: $CHAIN"
echo "  Blocks: $BLOCKS"
echo ""
echo "✅ Ready to run VerusID service!"

