#!/bin/bash
# Monitor Verus Daemon Startup with Optimized Config

VERUS_CLI="/home/explorer/Downloads/verus-cli/verus"

echo "=============================================="
echo "  Monitoring Optimized Verus Daemon Startup"
echo "=============================================="
echo ""
echo "🔧 New Configuration Active:"
echo "  • RPC threads: 24 (was 16)"
echo "  • Work queue: 2048 (was 1024)"
echo "  • DB cache: 4GB (was 2GB)"
echo "  • Mempool: 1GB (was 512MB)"
echo "  • Connections: 125 (was 40)"
echo "  • ZMQ: 4 separate ports (was conflicted)"
echo ""
echo "⏳ Waiting for daemon to become ready..."
echo "   This typically takes 60-90 minutes"
echo ""

START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    MINUTES=$((ELAPSED / 60))
    
    # Try to get info
    INFO=$($VERUS_CLI getinfo 2>&1)
    
    if echo "$INFO" | grep -q "Loading block index"; then
        echo "[$(date +%H:%M:%S)] ⏳ Still loading block index... (${MINUTES} min elapsed)"
        
        # Show process stats
        PS_INFO=$(ps aux | grep verusd | grep -v grep | awk '{print "CPU: "$3"% | RAM: "$6/1024/1024"GB"}')
        echo "              $PS_INFO"
        
    elif echo "$INFO" | grep -q '"blocks"'; then
        # Success!
        echo ""
        echo "🎉 ================================"
        echo "   DAEMON IS READY!"
        echo "   ================================"
        echo ""
        
        # Show info
        BLOCKS=$(echo "$INFO" | grep -oP '"blocks":\s*\K\d+')
        CONNECTIONS=$(echo "$INFO" | grep -oP '"connections":\s*\K\d+')
        
        echo "📊 Status:"
        echo "  • Blocks: $BLOCKS"
        echo "  • Connections: $CONNECTIONS"
        echo "  • Startup time: ${MINUTES} minutes"
        echo ""
        
        # Check ZMQ
        echo "📡 Checking ZMQ ports..."
        ZMQ_STATUS=$(netstat -tuln 2>/dev/null | grep "127.0.0.1:2833" || echo "Not visible yet")
        if echo "$ZMQ_STATUS" | grep -q "28332"; then
            echo "  ✅ ZMQ ports active:"
            netstat -tuln 2>/dev/null | grep "127.0.0.1:2833" | awk '{print "     "$4}' | sort
        else
            echo "  ⚠️  ZMQ ports not yet visible (may need a few more minutes)"
        fi
        
        echo ""
        echo "✅ Next steps:"
        echo "  1. Test explorer: curl http://localhost:3000/api/health | jq"
        echo "  2. View blockchain info: $VERUS_CLI getblockchaininfo"
        echo "  3. Monitor connections: watch -n 5 '$VERUS_CLI getinfo | grep connections'"
        echo ""
        
        break
    else
        echo "[$(date +%H:%M:%S)] ⚠️  Unexpected status (${MINUTES} min): $INFO"
    fi
    
    # Wait 30 seconds before next check
    sleep 30
done

echo "Monitor complete!"




