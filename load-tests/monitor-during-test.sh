#!/bin/bash

# Monitor server resources during load testing
# Run this in a separate terminal while load tests are running

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

API_URL=${1:-"http://localhost:3000/api/health"}
INTERVAL=${2:-5}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Server Performance Monitor                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Monitoring: ${API_URL}${NC}"
echo -e "${YELLOW}Update interval: ${INTERVAL} seconds${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Function to format bytes
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$((bytes / 1024))KB"
    elif [ $bytes -lt 1073741824 ]; then
        echo "$((bytes / 1048576))MB"
    else
        echo "$((bytes / 1073741824))GB"
    fi
}

# Function to get color based on value
get_color() {
    local value=$1
    local warning=$2
    local critical=$3
    
    if (( $(echo "$value < $warning" | bc -l) )); then
        echo "$GREEN"
    elif (( $(echo "$value < $critical" | bc -l) )); then
        echo "$YELLOW"
    else
        echo "$RED"
    fi
}

# Monitor loop
iteration=0
while true; do
    clear
    iteration=$((iteration + 1))
    
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Server Performance Monitor - Iteration #${iteration}${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Get health check data
    response=$(curl -s "$API_URL" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Parse response time
        response_time=$(curl -w "%{time_total}" -o /dev/null -s "$API_URL")
        response_ms=$(echo "$response_time * 1000" | bc)
        
        # Get system memory usage
        if command -v free &> /dev/null; then
            mem_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
            mem_color=$(get_color "$mem_info" 70 90)
            echo -e "${mem_color}System Memory Usage: ${mem_info}%${NC}"
        fi
        
        # Get CPU usage
        if command -v top &> /dev/null; then
            cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
            cpu_color=$(get_color "$cpu_usage" 70 90)
            echo -e "${cpu_color}System CPU Usage: ${cpu_usage}%${NC}"
        fi
        
        # Parse health data if available
        if echo "$response" | jq -e '.success' &> /dev/null; then
            echo ""
            echo -e "${BLUE}─────────────── API Health ───────────────${NC}"
            
            # Overall status
            overall=$(echo "$response" | jq -r '.data.overall // "unknown"')
            if [ "$overall" = "healthy" ]; then
                echo -e "${GREEN}Overall Status: ${overall}${NC}"
            else
                echo -e "${RED}Overall Status: ${overall}${NC}"
            fi
            
            # Response time
            resp_color=$(get_color "$response_ms" 500 2000)
            echo -e "${resp_color}API Response Time: ${response_ms} ms${NC}"
            
            echo ""
            echo -e "${BLUE}─────────────── Components ───────────────${NC}"
            
            # Redis
            redis_status=$(echo "$response" | jq -r '.data.components[] | select(.component=="redis") | .status // "unknown"')
            redis_duration=$(echo "$response" | jq -r '.data.components[] | select(.component=="redis") | .metrics.duration // 0')
            redis_memory=$(echo "$response" | jq -r '.data.components[] | select(.component=="redis") | .metrics.memoryUsage // "0"')
            redis_keys=$(echo "$response" | jq -r '.data.components[] | select(.component=="redis") | .metrics.totalKeys // 0')
            
            if [ "$redis_status" = "healthy" ]; then
                echo -e "${GREEN}✓ Redis: ${redis_status} (${redis_duration}ms, ${redis_keys} keys, ${redis_memory})${NC}"
            else
                echo -e "${RED}✗ Redis: ${redis_status}${NC}"
            fi
            
            # RPC
            rpc_status=$(echo "$response" | jq -r '.data.components[] | select(.component=="rpc") | .status // "unknown"')
            rpc_duration=$(echo "$response" | jq -r '.data.components[] | select(.component=="rpc") | .metrics.duration // 0')
            rpc_blocks=$(echo "$response" | jq -r '.data.components[] | select(.component=="rpc") | .metrics.blocks // 0')
            rpc_connections=$(echo "$response" | jq -r '.data.components[] | select(.component=="rpc") | .metrics.connections // 0')
            
            if [ "$rpc_status" = "healthy" ]; then
                echo -e "${GREEN}✓ RPC: ${rpc_status} (${rpc_duration}ms, block ${rpc_blocks}, ${rpc_connections} conns)${NC}"
            else
                echo -e "${RED}✗ RPC: ${rpc_status}${NC}"
            fi
            
            # Cache
            cache_status=$(echo "$response" | jq -r '.data.components[] | select(.component=="cache") | .status // "unknown"')
            cache_duration=$(echo "$response" | jq -r '.data.components[] | select(.component=="cache") | .metrics.duration // 0')
            cache_keys=$(echo "$response" | jq -r '.data.components[] | select(.component=="cache") | .metrics.totalKeys // 0')
            
            if [ "$cache_status" = "healthy" ]; then
                echo -e "${GREEN}✓ Cache: ${cache_status} (${cache_duration}ms, ${cache_keys} keys)${NC}"
            else
                echo -e "${RED}✗ Cache: ${cache_status}${NC}"
            fi
            
            # Memory component
            mem_status=$(echo "$response" | jq -r '.data.components[] | select(.component=="memory") | .status // "unknown"')
            heap_used=$(echo "$response" | jq -r '.data.components[] | select(.component=="memory") | .metrics.heapUsed // 0')
            heap_total=$(echo "$response" | jq -r '.data.components[] | select(.component=="memory") | .metrics.heapTotal // 0')
            mem_percent=$(echo "$response" | jq -r '.data.components[] | select(.component=="memory") | .metrics.usagePercent // 0')
            
            if [ "$mem_status" = "healthy" ]; then
                mem_used_mb=$((heap_used / 1024 / 1024))
                mem_total_mb=$((heap_total / 1024 / 1024))
                mem_pct_color=$(get_color "$mem_percent" 70 90)
                echo -e "${mem_pct_color}✓ Node.js Memory: ${mem_used_mb}MB / ${mem_total_mb}MB (${mem_percent}%)${NC}"
            else
                echo -e "${RED}✗ Memory: ${mem_status}${NC}"
            fi
        else
            echo -e "${YELLOW}Note: Health endpoint returned unexpected data${NC}"
            echo -e "Response: ${response:0:200}..."
        fi
    else
        echo -e "${RED}✗ Failed to connect to server${NC}"
        echo -e "${YELLOW}Make sure your server is running at: ${API_URL}${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "Last update: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "Next update in ${INTERVAL} seconds... (Press Ctrl+C to stop)"
    
    sleep "$INTERVAL"
done

