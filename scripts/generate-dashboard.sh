#!/bin/bash
# VerusPulse Monitoring Dashboard
# Simple web-based monitoring for autonomous scanner system

SCRIPT_DIR="/home/explorer/verus-dapp"
LOG_DIR="$SCRIPT_DIR/logs"
DASHBOARD_FILE="$SCRIPT_DIR/public/scanner-dashboard.html"

# Generate HTML dashboard
generate_dashboard() {
    cat > "$DASHBOARD_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VerusPulse Scanner Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .status-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-healthy { background: #27ae60; }
        .status-unhealthy { background: #e74c3c; }
        .status-warning { background: #f39c12; }
        .metric { margin: 10px 0; }
        .metric-label { font-weight: bold; color: #2c3e50; }
        .metric-value { color: #34495e; }
        .log-container { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 10px 0; }
        .refresh-btn:hover { background: #2980b9; }
        .timestamp { color: #7f8c8d; font-size: 11px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 VerusPulse Autonomous Scanner Dashboard</h1>
            <p class="timestamp">Last updated: <span id="timestamp"></span></p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>🏥 Infrastructure Health</h3>
                <div class="metric">
                    <span class="metric-label">RPC Connection:</span>
                    <span class="status-indicator" id="rpc-status"></span>
                    <span class="metric-value" id="rpc-text">Checking...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Database:</span>
                    <span class="status-indicator" id="db-status"></span>
                    <span class="metric-value" id="db-text">Checking...</span>
                </div>
            </div>
            
            <div class="status-card">
                <h3>🔍 Scanner Status</h3>
                <div class="metric">
                    <span class="metric-label">Staking Scanner:</span>
                    <span class="status-indicator" id="staking-status"></span>
                    <span class="metric-value" id="staking-text">Checking...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">VerusID Discovery:</span>
                    <span class="status-indicator" id="verusid-status"></span>
                    <span class="metric-value" id="verusid-text">Checking...</span>
                </div>
            </div>
            
            <div class="status-card">
                <h3>📊 Database Statistics</h3>
                <div class="metric">
                    <span class="metric-label">Total Staking Rewards:</span>
                    <span class="metric-value" id="stake-count">Loading...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total VerusIDs:</span>
                    <span class="metric-value" id="verusid-count">Loading...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Latest Block:</span>
                    <span class="metric-value" id="latest-block">Loading...</span>
                </div>
            </div>
            
            <div class="status-card">
                <h3>📝 Recent Activity</h3>
                <div class="log-container" id="recent-logs">
                    Loading recent activity...
                </div>
            </div>
        </div>
    </div>

    <script>
        // Update timestamp
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            location.reload();
        }, 30000);
        
        // You can add JavaScript here to fetch real-time data via API
        // For now, the page refreshes every 30 seconds
    </script>
</body>
</html>
EOF
}

# Generate status data
generate_status_data() {
    local status_file="$LOG_DIR/dashboard-status.json"
    
    # Check RPC health
    local rpc_healthy=false
    if timeout 10 curl -s -X POST http://127.0.0.1:18843 \
        -H "Content-Type: application/json" \
        -d '{"method":"getblockchaininfo","params":[],"id":1}' | grep -q "result"; then
        rpc_healthy=true
    fi
    
    # Check database health
    local db_healthy=false
    if PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT 1;" > /dev/null 2>&1; then
        db_healthy=true
    fi
    
    # Check scanner processes
    local staking_running=false
    local verusid_running=false
    
    if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
        staking_running=true
    fi
    
    if pgrep -f "continue-scanning-api.js" > /dev/null; then
        verusid_running=true
    fi
    
    # Get database statistics
    local stake_count=0
    local verusid_count=0
    local latest_block=0
    
    if [ "$db_healthy" = true ]; then
        stake_count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
        verusid_count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM identities;" 2>/dev/null | tr -d ' ')
        latest_block=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
    fi
    
    # Generate JSON status
    cat > "$status_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "infrastructure": {
        "rpc": $rpc_healthy,
        "database": $db_healthy
    },
    "scanners": {
        "staking": $staking_running,
        "verusid": $verusid_running
    },
    "statistics": {
        "stake_count": $stake_count,
        "verusid_count": $verusid_count,
        "latest_block": $latest_block
    }
}
EOF
}

# Main function
main() {
    echo "📊 Generating VerusPulse monitoring dashboard..."
    
    # Generate dashboard HTML
    generate_dashboard
    
    # Generate status data
    generate_status_data
    
    echo "✅ Dashboard generated: $DASHBOARD_FILE"
    echo "📊 Status data: $LOG_DIR/dashboard-status.json"
    echo ""
    echo "🌐 Access dashboard at: http://localhost:3000/scanner-dashboard.html"
    echo "📱 Dashboard auto-refreshes every 30 seconds"
}

# Run main function
main "$@"
