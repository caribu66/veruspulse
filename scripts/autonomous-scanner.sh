#!/bin/bash
# VerusPulse Autonomous Scanner System
# This script ensures complete autonomy with self-healing capabilities

# ============================================================================
# AUTONOMOUS SCANNER MANAGER
# ============================================================================

# Configuration
SCRIPT_DIR="/home/explorer/verus-dapp"
LOG_DIR="$SCRIPT_DIR/logs"
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=300  # 5 minutes between restart attempts

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/autonomous-scanner.log"
}

# Check if a process is running
is_process_running() {
    local process_name="$1"
    pgrep -f "$process_name" > /dev/null
}

# Get process count
get_process_count() {
    local process_name="$1"
    pgrep -f "$process_name" | wc -l
}

# Kill all instances of a process
kill_process() {
    local process_name="$1"
    pkill -f "$process_name" 2>/dev/null
    sleep 2
    # Force kill if still running
    pkill -9 -f "$process_name" 2>/dev/null
}

# Check RPC connection with timeout
check_rpc_health() {
    local timeout=10
    local response=$(timeout $timeout curl -s -X POST http://127.0.0.1:18843 \
        -H "Content-Type: application/json" \
        -d '{"method":"getblockchaininfo","params":[],"id":1}' 2>/dev/null)
    
    if echo "$response" | grep -q "result"; then
        return 0
    else
        return 1
    fi
}

# Check database connection
check_database_health() {
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT 1;" > /dev/null 2>&1
}

# Start staking scanner autonomously
start_staking_scanner() {
    local attempts=0
    local max_attempts=3
    
    while [ $attempts -lt $max_attempts ]; do
        log_message "🚀 Starting staking scanner (attempt $((attempts + 1))/$max_attempts)"
        
        cd "$SCRIPT_DIR"
        nohup ./scripts/start-staking-scan.sh > "$LOG_DIR/staking-scanner.log" 2>&1 &
        
        # Wait for process to start
        sleep 10
        
        if is_process_running "optimize-staking-scanner.js"; then
            log_message "✅ Staking scanner started successfully"
            return 0
        else
            attempts=$((attempts + 1))
            log_message "❌ Staking scanner failed to start, retrying in 30 seconds..."
            sleep 30
        fi
    done
    
    log_message "❌ Failed to start staking scanner after $max_attempts attempts"
    return 1
}

# Start VerusID discovery scanner autonomously
start_verusid_scanner() {
    local attempts=0
    local max_attempts=3
    
    while [ $attempts -lt $max_attempts ]; do
        log_message "🚀 Starting VerusID discovery scanner (attempt $((attempts + 1))/$max_attempts)"
        
        cd "$SCRIPT_DIR"
        nohup node scripts/continue-scanning-api.js > "$LOG_DIR/verusid-scanner.log" 2>&1 &
        
        # Wait for process to start
        sleep 10
        
        if is_process_running "continue-scanning-api.js"; then
            log_message "✅ VerusID discovery scanner started successfully"
            return 0
        else
            attempts=$((attempts + 1))
            log_message "❌ VerusID discovery scanner failed to start, retrying in 30 seconds..."
            sleep 30
        fi
    done
    
    log_message "❌ Failed to start VerusID discovery scanner after $max_attempts attempts"
    return 1
}

# Restart scanner with exponential backoff
restart_scanner_with_backoff() {
    local scanner_type="$1"
    local restart_count_file="$LOG_DIR/${scanner_type}_restart_count"
    local last_restart_file="$LOG_DIR/${scanner_type}_last_restart"
    
    # Read restart count
    local restart_count=0
    if [ -f "$restart_count_file" ]; then
        restart_count=$(cat "$restart_count_file")
    fi
    
    # Check if we're in cooldown period
    if [ -f "$last_restart_file" ]; then
        local last_restart=$(cat "$last_restart_file")
        local current_time=$(date +%s)
        local time_since_restart=$((current_time - last_restart))
        
        if [ $time_since_restart -lt $RESTART_COOLDOWN ]; then
            local remaining=$((RESTART_COOLDOWN - time_since_restart))
            log_message "⏳ $scanner_type scanner in cooldown, $remaining seconds remaining"
            return 1
        fi
    fi
    
    # Check restart limit
    if [ $restart_count -ge $MAX_RESTART_ATTEMPTS ]; then
        log_message "❌ $scanner_type scanner exceeded max restart attempts ($MAX_RESTART_ATTEMPTS)"
        return 1
    fi
    
    # Increment restart count
    restart_count=$((restart_count + 1))
    echo $restart_count > "$restart_count_file"
    echo $(date +%s) > "$last_restart_file"
    
    log_message "🔄 Restarting $scanner_type scanner (attempt $restart_count/$MAX_RESTART_ATTEMPTS)"
    
    # Kill existing process
    if [ "$scanner_type" = "staking" ]; then
        kill_process "optimize-staking-scanner.js"
        start_staking_scanner
    elif [ "$scanner_type" = "verusid" ]; then
        kill_process "continue-scanning-api.js"
        start_verusid_scanner
    fi
}

# Clean up old logs
cleanup_logs() {
    log_message "🧹 Cleaning up old log files"
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
    find "$LOG_DIR" -name "*_restart_count" -mtime +1 -delete 2>/dev/null
    find "$LOG_DIR" -name "*_last_restart" -mtime +1 -delete 2>/dev/null
}

# Reset restart counters daily
reset_restart_counters() {
    local current_hour=$(date +%H)
    if [ "$current_hour" = "00" ]; then
        log_message "🔄 Resetting daily restart counters"
        rm -f "$LOG_DIR"/*_restart_count
        rm -f "$LOG_DIR"/*_last_restart
    fi
}

# Main autonomous management function
manage_scanners_autonomously() {
    log_message "🤖 Starting autonomous scanner management"
    
    # Check infrastructure health
    if ! check_rpc_health; then
        log_message "❌ RPC connection unhealthy, skipping scanner checks"
        return 1
    fi
    
    if ! check_database_health; then
        log_message "❌ Database connection unhealthy, skipping scanner checks"
        return 1
    fi
    
    # Manage staking scanner
    if ! is_process_running "optimize-staking-scanner.js"; then
        log_message "❌ Staking scanner not running"
        if ! start_staking_scanner; then
            restart_scanner_with_backoff "staking"
        fi
    else
        log_message "✅ Staking scanner running normally"
        # Reset restart counter on successful check
        rm -f "$LOG_DIR/staking_restart_count"
    fi
    
    # Manage VerusID discovery scanner
    if ! is_process_running "continue-scanning-api.js"; then
        log_message "❌ VerusID discovery scanner not running"
        if ! start_verusid_scanner; then
            restart_scanner_with_backoff "verusid"
        fi
    else
        log_message "✅ VerusID discovery scanner running normally"
        # Reset restart counter on successful check
        rm -f "$LOG_DIR/verusid_restart_count"
    fi
    
    # Cleanup and maintenance
    cleanup_logs
    reset_restart_counters
    
    log_message "✅ Autonomous management cycle completed"
}

# Emergency recovery function
emergency_recovery() {
    log_message "🚨 Emergency recovery initiated"
    
    # Kill all scanner processes
    kill_process "optimize-staking-scanner.js"
    kill_process "continue-scanning-api.js"
    
    # Wait for cleanup
    sleep 10
    
    # Reset all restart counters
    rm -f "$LOG_DIR"/*_restart_count
    rm -f "$LOG_DIR"/*_last_restart
    
    # Restart everything
    start_staking_scanner
    start_verusid_scanner
    
    log_message "🔄 Emergency recovery completed"
}

# Health check and reporting
generate_health_report() {
    local report_file="$LOG_DIR/health-report.txt"
    
    echo "VerusPulse Scanner Health Report - $(date)" > "$report_file"
    echo "===========================================" >> "$report_file"
    echo "" >> "$report_file"
    
    # Infrastructure status
    echo "Infrastructure Status:" >> "$report_file"
    if check_rpc_health; then
        echo "✅ RPC Connection: Healthy" >> "$report_file"
    else
        echo "❌ RPC Connection: Unhealthy" >> "$report_file"
    fi
    
    if check_database_health; then
        echo "✅ Database Connection: Healthy" >> "$report_file"
    else
        echo "❌ Database Connection: Unhealthy" >> "$report_file"
    fi
    echo "" >> "$report_file"
    
    # Scanner status
    echo "Scanner Status:" >> "$report_file"
    if is_process_running "optimize-staking-scanner.js"; then
        echo "✅ Staking Scanner: Running" >> "$report_file"
    else
        echo "❌ Staking Scanner: Not Running" >> "$report_file"
    fi
    
    if is_process_running "continue-scanning-api.js"; then
        echo "✅ VerusID Discovery: Running" >> "$report_file"
    else
        echo "❌ VerusID Discovery: Not Running" >> "$report_file"
    fi
    echo "" >> "$report_file"
    
    # Database statistics
    echo "Database Statistics:" >> "$report_file"
    local stake_count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
    local verusid_count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM identities;" 2>/dev/null | tr -d ' ')
    
    echo "📊 Total Staking Rewards: $stake_count" >> "$report_file"
    echo "📊 Total VerusIDs: $verusid_count" >> "$report_file"
    echo "" >> "$report_file"
    
    # Recent activity
    echo "Recent Activity:" >> "$report_file"
    tail -5 "$LOG_DIR/autonomous-scanner.log" >> "$report_file"
    
    log_message "📊 Health report generated: $report_file"
}

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

case "$1" in
    "manage")
        manage_scanners_autonomously
        ;;
    "emergency")
        emergency_recovery
        ;;
    "health")
        generate_health_report
        cat "$LOG_DIR/health-report.txt"
        ;;
    "status")
        echo "🤖 VerusPulse Autonomous Scanner Status"
        echo "======================================"
        echo ""
        
        if check_rpc_health; then
            echo "✅ RPC: Healthy"
        else
            echo "❌ RPC: Unhealthy"
        fi
        
        if check_database_health; then
            echo "✅ Database: Healthy"
        else
            echo "❌ Database: Unhealthy"
        fi
        
        echo ""
        
        if is_process_running "optimize-staking-scanner.js"; then
            echo "✅ Staking Scanner: Running"
        else
            echo "❌ Staking Scanner: Not Running"
        fi
        
        if is_process_running "continue-scanning-api.js"; then
            echo "✅ VerusID Discovery: Running"
        else
            echo "❌ VerusID Discovery: Not Running"
        fi
        
        echo ""
        echo "📊 Recent Activity:"
        tail -3 "$LOG_DIR/autonomous-scanner.log" 2>/dev/null || echo "No recent activity"
        ;;
    *)
        echo "Usage: $0 {manage|emergency|health|status}"
        echo ""
        echo "Commands:"
        echo "  manage   - Run autonomous scanner management"
        echo "  emergency - Emergency recovery (reset everything)"
        echo "  health   - Generate health report"
        echo "  status   - Show current status"
        exit 1
        ;;
esac
