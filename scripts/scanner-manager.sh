#!/bin/bash
# VerusPulse Scanner Management Scripts
# These scripts ensure continuous scanning with automatic restarts

# ============================================================================
# STAKING SCANNER MANAGEMENT
# ============================================================================

# Check if staking scanner is running
check_staking_scanner() {
    if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
        echo "✅ Staking scanner is running (PID: $(pgrep -f "optimize-staking-scanner.js"))"
        return 0
    else
        echo "❌ Staking scanner is NOT running"
        return 1
    fi
}

# Start staking scanner
start_staking_scanner() {
    cd /home/explorer/verus-dapp
    echo "🚀 Starting staking scanner..."
    nohup ./scripts/start-staking-scan.sh > logs/staking-scanner-cron.log 2>&1 &
    echo "✅ Staking scanner started in background"
}

# Restart staking scanner
restart_staking_scanner() {
    echo "🔄 Restarting staking scanner..."
    pkill -f "optimize-staking-scanner.js" 2>/dev/null
    sleep 5
    start_staking_scanner
}

# ============================================================================
# VERUSID DISCOVERY SCANNER MANAGEMENT
# ============================================================================

# Check if VerusID discovery scanner is running
check_verusid_scanner() {
    if pgrep -f "continue-scanning-api.js" > /dev/null; then
        echo "✅ VerusID discovery scanner is running (PID: $(pgrep -f "continue-scanning-api.js"))"
        return 0
    else
        echo "❌ VerusID discovery scanner is NOT running"
        return 1
    fi
}

# Start VerusID discovery scanner
start_verusid_scanner() {
    cd /home/explorer/verus-dapp
    echo "🚀 Starting VerusID discovery scanner..."
    nohup node scripts/continue-scanning-api.js > logs/verusid-scanner-cron.log 2>&1 &
    echo "✅ VerusID discovery scanner started in background"
}

# Restart VerusID discovery scanner
restart_verusid_scanner() {
    echo "🔄 Restarting VerusID discovery scanner..."
    pkill -f "continue-scanning-api.js" 2>/dev/null
    sleep 5
    start_verusid_scanner
}

# ============================================================================
# UTXO SCANNER MANAGEMENT
# ============================================================================

# Check if UTXO scanner is running
check_utxo_scanner() {
    if pgrep -f "scan-all-verusids-utxos.js" > /dev/null; then
        echo "✅ UTXO scanner is running (PID: $(pgrep -f "scan-all-verusids-utxos.js"))"
        return 0
    else
        echo "❌ UTXO scanner is NOT running"
        return 1
    fi
}

# Start UTXO scanner (runs every 6 hours)
start_utxo_scanner() {
    cd /home/explorer/verus-dapp
    echo "🚀 Starting UTXO scanner..."
    nohup node scripts/scan-all-verusids-utxos.js > logs/utxo-scanner-cron.log 2>&1 &
    echo "✅ UTXO scanner started in background"
}

# ============================================================================
# HEALTH CHECK AND MAINTENANCE
# ============================================================================

# Check RPC connection
check_rpc_connection() {
    response=$(curl -s -X POST http://127.0.0.1:18843 \
        -H "Content-Type: application/json" \
        -d '{"method":"getblockchaininfo","params":[],"id":1}' \
        --max-time 10)
    
    if echo "$response" | grep -q "result"; then
        echo "✅ RPC connection is healthy"
        return 0
    else
        echo "❌ RPC connection failed"
        return 1
    fi
}

# Check database connection
check_database_connection() {
    if PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection is healthy"
        return 0
    else
        echo "❌ Database connection failed"
        return 1
    fi
}

# Clean up old log files
cleanup_logs() {
    echo "🧹 Cleaning up old log files..."
    find /home/explorer/verus-dapp/logs -name "*.log" -mtime +7 -delete 2>/dev/null
    echo "✅ Log cleanup completed"
}

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

# Ensure all scanners are running
ensure_scanners_running() {
    echo "🔍 Checking scanner status at $(date)"
    
    # Check RPC and database first
    if ! check_rpc_connection || ! check_database_connection; then
        echo "❌ Infrastructure issues detected, skipping scanner checks"
        return 1
    fi
    
    # Check and restart staking scanner
    if ! check_staking_scanner; then
        start_staking_scanner
    fi
    
    # Check and restart VerusID discovery scanner
    if ! check_verusid_scanner; then
        start_verusid_scanner
    fi
    
    echo "✅ Scanner health check completed"
}

# Full maintenance routine
full_maintenance() {
    echo "🔧 Running full maintenance at $(date)"
    
    # Clean up logs
    cleanup_logs
    
    # Ensure scanners are running
    ensure_scanners_running
    
    # Update UTXO data (runs less frequently)
    if ! check_utxo_scanner; then
        start_utxo_scanner
    fi
    
    echo "✅ Full maintenance completed"
}

# Show status of all scanners
show_status() {
    echo "📊 VerusPulse Scanner Status - $(date)"
    echo "=========================================="
    
    check_rpc_connection
    check_database_connection
    echo ""
    
    check_staking_scanner
    check_verusid_scanner
    check_utxo_scanner
    echo ""
    
    # Show recent log entries
    echo "📝 Recent Activity:"
    if [ -f "/home/explorer/verus-dapp/logs/staking-scanner-cron.log" ]; then
        echo "Staking Scanner:"
        tail -3 /home/explorer/verus-dapp/logs/staking-scanner-cron.log
    fi
    
    if [ -f "/home/explorer/verus-dapp/logs/verusid-scanner-cron.log" ]; then
        echo "VerusID Scanner:"
        tail -3 /home/explorer/verus-dapp/logs/verusid-scanner-cron.log
    fi
}

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

case "$1" in
    "start")
        ensure_scanners_running
        ;;
    "status")
        show_status
        ;;
    "maintenance")
        full_maintenance
        ;;
    "restart-staking")
        restart_staking_scanner
        ;;
    "restart-verusid")
        restart_verusid_scanner
        ;;
    "utxo")
        start_utxo_scanner
        ;;
    *)
        echo "Usage: $0 {start|status|maintenance|restart-staking|restart-verusid|utxo}"
        echo ""
        echo "Commands:"
        echo "  start          - Ensure all scanners are running"
        echo "  status         - Show status of all scanners"
        echo "  maintenance    - Run full maintenance routine"
        echo "  restart-staking - Restart staking scanner"
        echo "  restart-verusid - Restart VerusID discovery scanner"
        echo "  utxo           - Start UTXO scanner"
        exit 1
        ;;
esac
