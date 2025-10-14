#!/bin/bash
# Test script to sync a single VerusID

echo "🚀 Testing Comprehensive Staking System"
echo "======================================="
echo ""

# Check if VerusID provided
if [ -z "$1" ]; then
    echo "Usage: ./test-sync-single.sh <verusid>"
    echo "Example: ./test-sync-single.sh joanna@"
    exit 1
fi

VERUSID="$1"
BASE_URL="http://localhost:3000"

echo "📊 Syncing VerusID: $VERUSID"
echo ""

# Start the sync
echo "1. Starting sync..."
SYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/admin/sync-all-verusids?specific_id=${VERUSID}&batch_size=1&delay=5000")
echo "$SYNC_RESPONSE" | jq '.' 2>/dev/null || echo "$SYNC_RESPONSE"
echo ""

# Wait a bit for sync to start
sleep 2

# Check progress
echo "2. Checking progress..."
for i in {1..10}; do
    PROGRESS=$(curl -s "${BASE_URL}/api/admin/sync-all-verusids")
    STATUS=$(echo "$PROGRESS" | jq -r '.progress.status' 2>/dev/null)
    PROCESSED=$(echo "$PROGRESS" | jq -r '.progress.processed' 2>/dev/null)
    TOTAL=$(echo "$PROGRESS" | jq -r '.progress.total' 2>/dev/null)
    
    echo "   Status: $STATUS | Progress: $PROCESSED/$TOTAL"
    
    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "idle" ]; then
        break
    fi
    
    sleep 5
done

echo ""
echo "3. Checking statistics..."
sleep 2

# Try to get I-address for the VerusID
IDENTITY_RESPONSE=$(curl -s "${BASE_URL}/api/verusid/lookup" \
    -H "Content-Type: application/json" \
    -d "{\"input\": \"${VERUSID}\"}")

IADDR=$(echo "$IDENTITY_RESPONSE" | jq -r '.data.identity.identity.identityaddress' 2>/dev/null)

if [ "$IADDR" != "null" ] && [ -n "$IADDR" ]; then
    echo "   I-Address: $IADDR"
    
    # Get statistics
    STATS=$(curl -s "${BASE_URL}/api/verusid/${IADDR}/staking-stats")
    
    if echo "$STATS" | jq -e '.success' > /dev/null 2>&1; then
        echo ""
        echo "✅ Statistics loaded successfully!"
        echo ""
        echo "Summary:"
        echo "$STATS" | jq '.data.summary' 2>/dev/null || echo "   (Could not parse summary)"
    else
        echo ""
        echo "⚠️  Statistics not ready yet (this is normal for first sync)"
        echo "   The sync may take 30-120 seconds depending on stake history"
    fi
else
    echo "   Could not resolve I-address for $VERUSID"
fi

echo ""
echo "======================================="
echo "🎉 Test complete!"
echo ""
echo "View in browser: ${BASE_URL}/verusid?name=${VERUSID}"

