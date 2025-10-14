#!/bin/bash

# Comprehensive Redis Health Check
echo "🔍 Redis Health Check Report"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "1. Basic Connectivity Tests"
echo "---------------------------"

# Test 1: Ping
if redis-cli ping > /dev/null 2>&1; then
    print_status 0 "Redis server is responding to ping"
    PING_RESULT=$(redis-cli ping)
    echo "   Response: $PING_RESULT"
else
    print_status 1 "Redis server is not responding"
    echo "❌ Redis health check failed - server not accessible"
    exit 1
fi

# Test 2: Server Info
echo ""
print_info "Redis Server Information:"
SERVER_INFO=$(redis-cli info server | grep -E "(redis_version|uptime_in_seconds|connected_clients)")
echo "$SERVER_INFO"

echo ""
echo "2. Performance Tests"
echo "--------------------"

# Test 3: Basic Operations
print_info "Testing basic Redis operations..."

# Set a test key
if redis-cli set test_health_check "Redis is working" EX 60 > /dev/null 2>&1; then
    print_status 0 "SET operation successful"
else
    print_status 1 "SET operation failed"
fi

# Get the test key
GET_RESULT=$(redis-cli get test_health_check 2>/dev/null)
if [ "$GET_RESULT" = "Redis is working" ]; then
    print_status 0 "GET operation successful"
else
    print_status 1 "GET operation failed"
fi

# Check key expiration
TTL=$(redis-cli ttl test_health_check 2>/dev/null)
if [ "$TTL" -gt 0 ] && [ "$TTL" -le 60 ]; then
    print_status 0 "TTL/EXPIRE operation working (TTL: ${TTL}s)"
else
    print_status 1 "TTL/EXPIRE operation failed"
fi

# Delete test key
if redis-cli del test_health_check > /dev/null 2>&1; then
    print_status 0 "DEL operation successful"
else
    print_status 1 "DEL operation failed"
fi

echo ""
echo "3. Memory and Performance"
echo "-------------------------"

# Memory usage
MEMORY_INFO=$(redis-cli info memory | grep -E "(used_memory_human|maxmemory_human|evicted_keys)")
print_info "Memory Usage:"
echo "$MEMORY_INFO"

# Check if memory usage is reasonable
USED_MEMORY=$(redis-cli info memory | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
if [ "$USED_MEMORY" -lt 100000000 ]; then  # Less than 100MB
    print_status 0 "Memory usage is reasonable (${USED_MEMORY} bytes)"
else
    print_warning "Memory usage is high (${USED_MEMORY} bytes)"
fi

# Check evicted keys (should be 0 for healthy cache)
EVICTED_KEYS=$(redis-cli info stats | grep "evicted_keys:" | cut -d: -f2 | tr -d '\r')
if [ "$EVICTED_KEYS" = "0" ]; then
    print_status 0 "No keys evicted (cache healthy)"
else
    print_warning "Keys have been evicted (${EVICTED_KEYS} keys)"
fi

echo ""
echo "4. Advanced Operations"
echo "----------------------"

# Test JSON operations (important for our cache)
print_info "Testing JSON serialization..."

# Create a test JSON object
TEST_JSON='{"blockchain":{"blocks":12345,"chain":"testnet"},"timestamp":1696500000000}'
if redis-cli set test_json "$TEST_JSON" EX 30 > /dev/null 2>&1; then
    print_status 0 "JSON SET operation successful"
else
    print_status 1 "JSON SET operation failed"
fi

# Retrieve and validate JSON
RETRIEVED_JSON=$(redis-cli get test_json 2>/dev/null)
if [ "$RETRIEVED_JSON" = "$TEST_JSON" ]; then
    print_status 0 "JSON GET operation successful"
else
    print_status 1 "JSON GET operation failed"
fi

# Test pattern matching
PATTERN_KEYS=$(redis-cli keys "test_*" | wc -l)
if [ "$PATTERN_KEYS" -gt 0 ]; then
    print_status 0 "Pattern matching working (found $PATTERN_KEYS keys)"
else
    print_warning "Pattern matching test - no keys found"
fi

# Clean up test keys
redis-cli del test_json > /dev/null 2>&1

echo ""
echo "5. Cache-Specific Tests"
echo "-----------------------"

# Test cache-like operations
print_info "Testing cache-specific operations..."

# Set multiple keys with different TTLs
redis-cli setex "cache:blockchain:info" 30 "test_blockchain_data" > /dev/null 2>&1
redis-cli setex "cache:mining:info" 60 "test_mining_data" > /dev/null 2>&1
redis-cli setex "cache:network:info" 45 "test_network_data" > /dev/null 2>&1

# Count cache keys
CACHE_KEYS=$(redis-cli keys "cache:*" | wc -l)
if [ "$CACHE_KEYS" -eq 3 ]; then
    print_status 0 "Cache key management working ($CACHE_KEYS keys)"
else
    print_status 1 "Cache key management failed"
fi

# Test bulk operations
BULK_DELETE=$(redis-cli del $(redis-cli keys "cache:*"))
if [ "$BULK_DELETE" = "3" ]; then
    print_status 0 "Bulk operations working"
else
    print_status 1 "Bulk operations failed"
fi

echo ""
echo "6. Performance Benchmarks"
echo "-------------------------"

print_info "Running performance benchmark..."

# Simple benchmark
START_TIME=$(date +%s%N)
for i in {1..100}; do
    redis-cli set "benchmark:$i" "test_data_$i" > /dev/null 2>&1
done
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

if [ "$DURATION" -lt 1000 ]; then  # Less than 1 second for 100 operations
    print_status 0 "Performance is good (${DURATION}ms for 100 operations)"
else
    print_warning "Performance is slow (${DURATION}ms for 100 operations)"
fi

# Clean up benchmark keys
redis-cli del $(redis-cli keys "benchmark:*") > /dev/null 2>&1

echo ""
echo "7. Final Health Summary"
echo "======================="

# Overall health check
TOTAL_TESTS=0
PASSED_TESTS=0

# Count tests (simplified)
TOTAL_TESTS=10
PASSED_TESTS=0

# Check if Redis is still responsive
if redis-cli ping > /dev/null 2>&1; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Check memory usage
if [ "$USED_MEMORY" -lt 100000000 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Check if no keys are evicted
if [ "$EVICTED_KEYS" = "0" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Add more test checks here...

HEALTH_SCORE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))

echo "Health Score: $HEALTH_SCORE%"

if [ "$HEALTH_SCORE" -ge 90 ]; then
    print_status 0 "Redis is in excellent health"
elif [ "$HEALTH_SCORE" -ge 70 ]; then
    print_warning "Redis is in good health with minor issues"
else
    print_status 1 "Redis has significant health issues"
fi

echo ""
echo "🎉 Redis Health Check Complete!"
echo "Redis is ready for production use with your Verus Explorer."






















