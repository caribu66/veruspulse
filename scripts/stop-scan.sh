#!/bin/bash
# Stop the Mass Scanner

echo "Stopping Mass Scanner..."
echo ""

curl -X POST http://localhost:3000/api/admin/mass-scan \
    -H "Content-Type: application/json" \
    -d '{"action": "stop"}' | jq

echo ""
echo "✅ Stop command sent"
echo ""

