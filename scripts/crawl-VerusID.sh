#!/bin/bash
# crawl-VerusID.sh
# Crawls the Verus blockchain to discover VerusIDs
# Writes ID names and i-addresses to database
# Uses multi-threading for speed

set -e

# Configuration
RPC_USER="${VERUS_RPC_USER:-verus}"
RPC_PASSWORD="${VERUS_RPC_PASSWORD:-verus}"
RPC_HOST="${VERUS_RPC_HOST:-192.168.86.89}"
RPC_PORT="${VERUS_RPC_PORT:-27486}"
DB_URL="${DATABASE_URL:-postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db}"

# Parse database connection string
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Get number of CPU cores for parallel processing
NUM_CORES=$(nproc)
PARALLEL_JOBS=$((NUM_CORES > 4 ? 4 : NUM_CORES))  # Max 4 to avoid hammering RPC

# Log file
LOG_FILE="verusid-crawl-$(date +%Y%m%d-%H%M%S).log"
FOUND_IDS_FILE="found-verusids.txt"

# Show header (unless getting current height)
show_header() {
    echo "===================================================="
    echo "  VerusID Blockchain Crawler"
    echo "===================================================="
    echo ""
    echo "Configuration:"
    echo "  RPC: $RPC_HOST:$RPC_PORT"
    echo "  Database: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Parallel jobs: $PARALLEL_JOBS"
    echo "  Log file: $LOG_FILE"
    echo ""
}

# RPC call helper
rpc_call() {
    local method="$1"
    shift
    local params="$*"
    
    curl -s --user "$RPC_USER:$RPC_PASSWORD" \
        --data-binary "{\"jsonrpc\":\"1.0\",\"id\":\"crawler\",\"method\":\"$method\",\"params\":[$params]}" \
        -H 'content-type: text/plain;' \
        "http://$RPC_HOST:$RPC_PORT/" 2>/dev/null
}

# Get blockchain height
get_current_height() {
    rpc_call "getblockcount" | jq -r '.result'
}

# Get block hash at height
get_block_hash() {
    local height=$1
    rpc_call "getblockhash" "$height" | jq -r '.result'
}

# Get block with full transaction data
get_block() {
    local hash="$1"
    rpc_call "getblock" "\"$hash\", 2" | jq -r '.result'
}

# Extract VerusIDs from block
extract_verusids_from_block() {
    local height=$1
    local hash=$(get_block_hash "$height")
    
    if [ -z "$hash" ] || [ "$hash" = "null" ]; then
        return
    fi
    
    # Get block with full transaction data
    local block=$(get_block "$hash")
    
    if [ -z "$block" ] || [ "$block" = "null" ]; then
        return
    fi
    
    # Extract all vout addresses that start with 'i' (VerusID addresses)
    echo "$block" | jq -r '
        .tx[]? | 
        .vout[]? | 
        .scriptPubKey.addresses[]? | 
        select(startswith("i"))
    ' 2>/dev/null | sort -u || true
}

# Insert VerusID into database
insert_verusid() {
    local i_address="$1"
    
    # Try to get identity details from RPC
    local identity_json=$(rpc_call "getidentity" "\"$i_address\"" 2>/dev/null)
    local name=$(echo "$identity_json" | jq -r '.result.identity.name // empty' 2>/dev/null)
    local friendly=$(echo "$identity_json" | jq -r '.result.fullyqualifiedname // empty' 2>/dev/null)
    
    if [ -z "$name" ]; then
        name="unknown"
    fi
    
    if [ -z "$friendly" ]; then
        friendly="${name}.VRSC@"
    fi
    
    # Insert or update in database
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF 2>/dev/null
INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
VALUES ('$i_address', '$name', '$friendly', NOW())
ON CONFLICT (identity_address) 
DO UPDATE SET 
    last_refreshed_at = NOW();
EOF
    
    echo "[$(date '+%H:%M:%S')] Found: $i_address ($name)" | tee -a "$LOG_FILE"
}

# Process a range of blocks (worker function for parallel execution)
process_block_range() {
    local start=$1
    local end=$2
    local worker_id=$3
    
    for ((height=start; height<=end; height++)); do
        local addresses=$(extract_verusids_from_block "$height")
        
        if [ -n "$addresses" ]; then
            while IFS= read -r addr; do
                if [ -n "$addr" ] && [ "$addr" != "null" ]; then
                    echo "$addr" >> "$FOUND_IDS_FILE.tmp.$worker_id"
                fi
            done <<< "$addresses"
        fi
        
        # Progress update every 100 blocks
        if ((height % 100 == 0)); then
            echo "[Worker $worker_id] Processed block $height" >> "$LOG_FILE"
        fi
    done
}

# Main crawler function
crawl_blockchain() {
    local start_height=${1:-1}
    local end_height=${2:-}
    
    # Get current height if not specified
    if [ -z "$end_height" ]; then
        echo "Fetching current blockchain height..."
        end_height=$(get_current_height)
    fi
    
    local total_blocks=$((end_height - start_height + 1))
    
    echo "Starting crawl from block $start_height to $end_height ($total_blocks blocks)"
    echo "Using $PARALLEL_JOBS parallel workers"
    echo ""
    
    # Calculate blocks per worker
    local blocks_per_worker=$((total_blocks / PARALLEL_JOBS))
    
    # Clear temp files
    rm -f "$FOUND_IDS_FILE.tmp."*
    
    # Launch parallel workers
    local pids=()
    for ((i=0; i<PARALLEL_JOBS; i++)); do
        local worker_start=$((start_height + (i * blocks_per_worker)))
        local worker_end=$((worker_start + blocks_per_worker - 1))
        
        # Last worker gets remaining blocks
        if ((i == PARALLEL_JOBS - 1)); then
            worker_end=$end_height
        fi
        
        echo "Starting worker $i: blocks $worker_start to $worker_end"
        process_block_range "$worker_start" "$worker_end" "$i" &
        pids+=($!)
    done
    
    echo ""
    echo "Workers launched. Processing blocks..."
    echo "Monitor progress: tail -f $LOG_FILE"
    echo ""
    
    # Wait for all workers to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    echo ""
    echo "All workers completed. Consolidating results..."
    
    # Merge and deduplicate results
    cat "$FOUND_IDS_FILE.tmp."* 2>/dev/null | sort -u > "$FOUND_IDS_FILE"
    rm -f "$FOUND_IDS_FILE.tmp."*
    
    local unique_count=$(wc -l < "$FOUND_IDS_FILE")
    echo "Found $unique_count unique VerusID addresses"
    echo ""
    
    # Insert into database
    if [ "$unique_count" -gt 0 ]; then
        echo "Inserting into database..."
        local processed=0
        
        while IFS= read -r addr; do
            insert_verusid "$addr"
            ((processed++))
            
            # Progress update
            if ((processed % 100 == 0)); then
                local percent=$((processed * 100 / unique_count))
                echo "Progress: $processed/$unique_count ($percent%)"
            fi
            
            # Small delay to avoid hammering RPC
            sleep 0.1
        done < "$FOUND_IDS_FILE"
        
        echo ""
        echo "✅ Complete! Inserted $processed VerusIDs into database"
    else
        echo "⚠️  No VerusIDs found in the specified block range"
    fi
}

# Command-line interface
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -s, --start HEIGHT      Start block height (default: 1)
    -e, --end HEIGHT        End block height (default: current)
    -j, --jobs N            Number of parallel jobs (default: CPU cores, max 4)
    -h, --help              Show this help message

Examples:
    # Crawl entire blockchain
    $0

    # Crawl specific range
    $0 --start 3700000 --end 3800000

    # Crawl recent blocks (last 10,000)
    $0 --start \$((\$(./scripts/crawl-VerusID.sh --current-height) - 10000))

    # Use 8 parallel jobs
    $0 --jobs 8

Environment Variables:
    VERUS_RPC_USER      RPC username (default: verus)
    VERUS_RPC_PASSWORD  RPC password (default: verus)
    VERUS_RPC_HOST      RPC host (default: 192.168.86.89)
    VERUS_RPC_PORT      RPC port (default: 27486)
    DATABASE_URL        PostgreSQL connection string

EOF
}

# Parse arguments
START_HEIGHT=1
END_HEIGHT=""
SHOW_HEADER=1

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--start)
            START_HEIGHT="$2"
            shift 2
            ;;
        -e|--end)
            END_HEIGHT="$2"
            shift 2
            ;;
        -j|--jobs)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        --current-height)
            get_current_height
            exit 0
            ;;
        -h|--help)
            SHOW_HEADER=0
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show header
if [ "$SHOW_HEADER" -eq 1 ]; then
    show_header
fi

# Run the crawler
crawl_blockchain "$START_HEIGHT" "$END_HEIGHT"

