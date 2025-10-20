#!/bin/bash

# Quick load test script - shorter duration for rapid iteration
# Useful for testing optimizations quickly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL=${BASE_URL:-"http://localhost:3000"}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Quick Load Test (50 users, 1 minute)              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null && ! [ -f ~/bin/k6 ]; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please run: ./load-tests/run-load-tests.sh"
    exit 1
fi

# Set k6 command
K6_CMD="k6"
if [ -f ~/bin/k6 ]; then
    export PATH="$HOME/bin:$PATH"
fi

echo -e "${YELLOW}Testing ${BASE_URL}...${NC}"
echo ""

# Create quick test script
cat > /tmp/k6-quick-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    quick_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '15s', target: 0 },
      ],
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res1 = http.get(`${BASE_URL}/api/blockchain-info`);
  check(res1, { 'blockchain-info ok': (r) => r.status === 200 });
  sleep(0.5);
  
  const res2 = http.get(`${BASE_URL}/api/latest-blocks`);
  check(res2, { 'latest-blocks ok': (r) => r.status === 200 });
  sleep(0.5);
  
  const res3 = http.get(`${BASE_URL}/api/mempool/transactions`);
  check(res3, { 'mempool ok': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run quick test
BASE_URL="${BASE_URL}" $K6_CMD run /tmp/k6-quick-test.js

echo ""
echo -e "${GREEN}Quick test completed!${NC}"
echo ""

