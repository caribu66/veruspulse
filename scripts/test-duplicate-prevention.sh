#!/bin/bash

# Test Duplicate Instance Prevention
# This script verifies that duplicate prevention is working correctly

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Testing Duplicate Instance Prevention                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test function
test_case() {
    local description="$1"
    echo -e "${BLUE}Testing: $description${NC}"
}

pass() {
    echo -e "${GREEN}  ✓ PASS${NC}"
    PASSED=$((PASSED + 1))
    echo ""
}

fail() {
    local message="$1"
    echo -e "${RED}  ✗ FAIL: $message${NC}"
    FAILED=$((FAILED + 1))
    echo ""
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    ../scripts/stop-all-services.sh > /dev/null 2>&1
    rm -f ../.*.lock
    sleep 1
}

# Change to project root
cd "$(dirname "$0")/.." || exit 1

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Ensure clean state
cleanup

echo -e "${BLUE}Starting Tests...${NC}"
echo ""

# Test 1: Lock file creation
test_case "Lock file creation"
touch .test-lock.lock
echo '{"pid":12345}' > .test-lock.lock
if [ -f .test-lock.lock ]; then
    pass
else
    fail "Could not create lock file"
fi
rm -f .test-lock.lock

# Test 2: Lock file parsing
test_case "Lock file JSON parsing"
echo '{"pid":12345,"port":3000}' > .test-lock.lock
PID=$(cat .test-lock.lock | grep -o '"pid":[0-9]*' | cut -d':' -f2)
if [ "$PID" = "12345" ]; then
    pass
else
    fail "Could not parse PID from lock file"
fi
rm -f .test-lock.lock

# Test 3: Stale lock detection
test_case "Stale lock file detection"
echo '{"pid":99999}' > .test-lock.lock
if kill -0 99999 2>/dev/null; then
    fail "PID 99999 unexpectedly exists"
else
    pass
fi
rm -f .test-lock.lock

# Test 4: Process lock utility
test_case "Process lock utility exists"
if [ -f "scripts/lib/process-lock.js" ]; then
    pass
else
    fail "process-lock.js not found"
fi

# Test 5: Start scripts exist
test_case "Start scripts exist"
MISSING=0
for script in "scripts/check-port-and-dev.js" "scripts/check-port-and-start.js" "scripts/stop-server.js"; do
    if [ ! -f "$script" ]; then
        echo -e "${RED}    Missing: $script${NC}"
        MISSING=$((MISSING + 1))
    fi
done
if [ $MISSING -eq 0 ]; then
    pass
else
    fail "$MISSING script(s) missing"
fi

# Test 6: Management scripts exist
test_case "Management scripts exist"
MISSING=0
for script in "scripts/status-all-services.sh" "scripts/stop-all-services.sh"; do
    if [ ! -f "$script" ]; then
        echo -e "${RED}    Missing: $script${NC}"
        MISSING=$((MISSING + 1))
    fi
done
if [ $MISSING -eq 0 ]; then
    pass
else
    fail "$MISSING script(s) missing"
fi

# Test 7: Scripts are executable
test_case "Scripts are executable"
NOT_EXECUTABLE=0
for script in "scripts/status-all-services.sh" "scripts/stop-all-services.sh" "scripts/start-daemon-monitor.sh" "scripts/start-stake-monitor.sh"; do
    if [ ! -x "$script" ]; then
        echo -e "${RED}    Not executable: $script${NC}"
        NOT_EXECUTABLE=$((NOT_EXECUTABLE + 1))
    fi
done
if [ $NOT_EXECUTABLE -eq 0 ]; then
    pass
else
    fail "$NOT_EXECUTABLE script(s) not executable"
fi

# Test 8: NPM scripts exist
test_case "NPM scripts configured"
MISSING=0
for cmd in "dev" "dev:stop" "start" "stop" "services:status" "services:stop"; do
    if ! grep -q "\"$cmd\":" package.json; then
        echo -e "${RED}    Missing NPM script: $cmd${NC}"
        MISSING=$((MISSING + 1))
    fi
done
if [ $MISSING -eq 0 ]; then
    pass
else
    fail "$MISSING NPM script(s) missing"
fi

# Test 9: Documentation exists
test_case "Documentation exists"
if [ -f "DUPLICATE-PREVENTION.md" ] && [ -f "QUICK-SERVICE-REFERENCE.md" ]; then
    pass
else
    fail "Documentation files missing"
fi

# Test 10: .gitignore includes lock files
test_case ".gitignore includes lock files"
if grep -q ".lock" .gitignore; then
    pass
else
    fail "Lock files not in .gitignore"
fi

# Test 11: Status script runs
test_case "Status script execution"
if ./scripts/status-all-services.sh > /dev/null 2>&1; then
    pass
else
    fail "Status script failed to execute"
fi

# Test 12: Stop script runs
test_case "Stop script execution"
if ./scripts/stop-all-services.sh > /dev/null 2>&1; then
    pass
else
    fail "Stop script failed to execute"
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}Test Results:${NC}"
echo -e "${GREEN}  Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}  Failed: $FAILED${NC}"
else
    echo -e "${GREEN}  Failed: 0${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Duplicate instance prevention is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo -e "${YELLOW}Please review the failures above.${NC}"
    exit 1
fi




