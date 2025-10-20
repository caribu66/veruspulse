#!/bin/bash

# Load Testing Script for VerusPulse
# This script runs various load tests using k6

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_TYPE=${1:-"load"}
OUTPUT_DIR="./load-tests/results"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Print banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         VerusPulse Load Testing Suite                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo ""
    echo -e "${YELLOW}Please install k6:${NC}"
    echo ""
    echo "  On macOS (using Homebrew):"
    echo "    brew install k6"
    echo ""
    echo "  On Linux (Debian/Ubuntu):"
    echo "    sudo gpg -k"
    echo "    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "    echo \"deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "    sudo apt-get update"
    echo "    sudo apt-get install k6"
    echo ""
    echo "  Using Docker:"
    echo "    docker pull grafana/k6:latest"
    echo ""
    echo "  For more options, visit: https://k6.io/docs/getting-started/installation/"
    echo ""
    exit 1
fi

# Check if server is running
echo -e "${YELLOW}Checking if server is available at ${BASE_URL}...${NC}"
if curl -s -f -o /dev/null "${BASE_URL}/api/health"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not responding${NC}"
    echo -e "${YELLOW}Please start your server first:${NC}"
    echo "  npm run dev"
    echo "  or"
    echo "  npm run build && npm start"
    exit 1
fi

echo ""

# Function to run a specific test
run_test() {
    local test_file=$1
    local test_name=$2
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local result_file="${OUTPUT_DIR}/${test_name}-${timestamp}.json"
    
    echo -e "${BLUE}Running ${test_name}...${NC}"
    echo -e "${YELLOW}Results will be saved to: ${result_file}${NC}"
    echo ""
    
    BASE_URL="${BASE_URL}" k6 run \
        --out json="${result_file}" \
        "./load-tests/${test_file}"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ ${test_name} completed successfully${NC}"
    else
        echo ""
        echo -e "${RED}✗ ${test_name} failed${NC}"
    fi
    
    echo ""
    return $exit_code
}

# Run the appropriate test based on the argument
case "$TEST_TYPE" in
    "load")
        echo -e "${YELLOW}Running Load Test (100 concurrent users)${NC}"
        echo ""
        run_test "k6-load-test.js" "load-test"
        ;;
    
    "spike")
        echo -e "${YELLOW}Running Spike Test (sudden traffic spikes)${NC}"
        echo ""
        run_test "k6-spike-test.js" "spike-test"
        ;;
    
    "stress")
        echo -e "${YELLOW}Running Stress Test (gradually increasing load)${NC}"
        echo ""
        run_test "k6-stress-test.js" "stress-test"
        ;;
    
    "all")
        echo -e "${YELLOW}Running All Tests${NC}"
        echo ""
        
        run_test "k6-load-test.js" "load-test"
        echo -e "${YELLOW}Waiting 30 seconds before next test...${NC}"
        sleep 30
        
        run_test "k6-spike-test.js" "spike-test"
        echo -e "${YELLOW}Waiting 30 seconds before next test...${NC}"
        sleep 30
        
        run_test "k6-stress-test.js" "stress-test"
        
        echo -e "${GREEN}All tests completed!${NC}"
        ;;
    
    *)
        echo -e "${RED}Invalid test type: ${TEST_TYPE}${NC}"
        echo ""
        echo "Usage: $0 [load|spike|stress|all]"
        echo ""
        echo "  load   - Standard load test with 100 concurrent users"
        echo "  spike  - Spike test with sudden traffic increases"
        echo "  stress - Stress test to find system limits"
        echo "  all    - Run all tests sequentially"
        echo ""
        echo "Example:"
        echo "  $0 load"
        echo "  BASE_URL=http://localhost:3000 $0 load"
        echo ""
        exit 1
        ;;
esac

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Testing Complete                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Results saved in: ${OUTPUT_DIR}${NC}"
echo ""

