#!/bin/bash
# Start the Intelligent Mass Scanner for 10,000 VerusIDs
# This script provides an easy way to start and monitor the scan

echo "=================================================="
echo "  Intelligent Mass Scanner for 10K VerusIDs"
echo "=================================================="
echo ""

# Check if scanner is already running
echo "Checking scanner status..."
RUNNING=$(curl -s http://localhost:3000/api/admin/mass-scan | jq -r '.isRunning')

if [ "$RUNNING" = "true" ]; then
    echo "⚠️  Scanner is already running!"
    echo ""
    curl -s http://localhost:3000/api/admin/mass-scan | jq '{
        phase: .progress.currentPhase,
        addresses: .progress.totalAddresses,
        blocks: .progress.blocksProcessed,
        stakes: .progress.stakeEventsFound,
        elapsed: .progress.elapsedTime
    }'
    echo ""
    echo "Run './scripts/monitor-scan.sh' to watch progress"
    exit 0
fi

echo ""
echo "Choose scan type:"
echo "1) Full History Scan (ALL blocks, ~20-40 hours, RECOMMENDED)"
echo "2) Recent Scan (Last 30 days, ~2-6 hours)"
echo "3) Recent Scan (Last 90 days, ~10-20 hours)"
echo "4) Custom Configuration"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "Starting FULL HISTORY scan..."
        echo "- Processing: ALL blockchain blocks"
        echo "- VerusIDs: 10,000"
        echo "- RPC Protection: 2 concurrent, 200ms delays"
        echo "- Duration: 20-40 hours"
        echo ""
        curl -X POST http://localhost:3000/api/admin/mass-scan \
            -H "Content-Type: application/json" \
            -d '{
                "action": "scan-full-history",
                "limitAddresses": 10000
            }' | jq
        ;;
    2)
        echo ""
        echo "Starting RECENT (30 days) scan..."
        echo "- Processing: Last ~43,200 blocks"
        echo "- VerusIDs: 10,000"
        echo "- RPC Protection: 5 concurrent, 50ms delays"
        echo "- Duration: 2-6 hours"
        echo ""
        curl -X POST http://localhost:3000/api/admin/mass-scan \
            -H "Content-Type: application/json" \
            -d '{
                "action": "scan-recent",
                "days": 30,
                "limitAddresses": 10000
            }' | jq
        ;;
    3)
        echo ""
        echo "Starting RECENT (90 days) scan..."
        echo "- Processing: Last ~129,600 blocks"
        echo "- VerusIDs: 10,000"
        echo "- RPC Protection: 5 concurrent, 50ms delays"
        echo "- Duration: 10-20 hours"
        echo ""
        curl -X POST http://localhost:3000/api/admin/mass-scan \
            -H "Content-Type: application/json" \
            -d '{
                "action": "scan-recent",
                "days": 90,
                "limitAddresses": 10000
            }' | jq
        ;;
    4)
        echo ""
        read -p "Max concurrent requests [2]: " concurrent
        concurrent=${concurrent:-2}
        read -p "Delay between batches (ms) [200]: " delay
        delay=${delay:-200}
        read -p "Block batch size [25]: " batch
        batch=${batch:-25}
        read -p "Limit addresses [10000]: " limit
        limit=${limit:-10000}
        
        echo ""
        echo "Starting CUSTOM scan..."
        echo "- Concurrent: $concurrent"
        echo "- Delay: ${delay}ms"
        echo "- Batch size: $batch"
        echo "- Address limit: $limit"
        echo ""
        curl -X POST http://localhost:3000/api/admin/mass-scan \
            -H "Content-Type: application/json" \
            -d "{
                \"action\": \"start\",
                \"config\": {
                    \"maxConcurrentRequests\": $concurrent,
                    \"delayBetweenBatches\": $delay,
                    \"blockBatchSize\": $batch,
                    \"cacheBlockData\": true
                },
                \"options\": {
                    \"limitAddresses\": $limit
                }
            }" | jq
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Scanner started!"
echo ""
echo "Monitor progress with:"
echo "  ./scripts/monitor-scan.sh"
echo ""
echo "Or check status:"
echo "  curl -s http://localhost:3000/api/admin/mass-scan | jq"
echo ""

