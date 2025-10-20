#!/bin/bash

# Comprehensive Development Readiness Audit
# This script checks all aspects of the development environment

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Comprehensive Development Readiness Audit                ║"
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
WARNINGS=0

# Test function
check() {
    local description="$1"
    echo -ne "${BLUE}Checking: $description${NC}"
}

pass() {
    echo -e " ${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
}

fail() {
    local message="$1"
    echo -e " ${RED}✗${NC}"
    if [ -n "$message" ]; then
        echo -e "${RED}  Error: $message${NC}"
    fi
    FAILED=$((FAILED + 1))
}

warn() {
    local message="$1"
    echo -e " ${YELLOW}⚠${NC}"
    if [ -n "$message" ]; then
        echo -e "${YELLOW}  Warning: $message${NC}"
    fi
    WARNINGS=$((WARNINGS + 1))
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1. ENVIRONMENT & DEPENDENCIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Node.js version
check "Node.js version (18+)"
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" -ge 18 ]; then
    pass
else
    fail "Node.js 18+ required, found: $(node -v 2>/dev/null || echo 'not installed')"
fi

# NPM
check "npm installed"
if command -v npm &> /dev/null; then
    pass
else
    fail "npm not found"
fi

# Dependencies installed
check "node_modules exists"
if [ -d "node_modules" ]; then
    pass
else
    fail "Run: npm install"
fi

# TypeScript
check "TypeScript installed"
if npm list typescript 2>&1 | grep -q "typescript@"; then
    pass
else
    fail "TypeScript not found"
fi

# Next.js
check "Next.js installed"
if npm list next 2>&1 | grep -q "next@"; then
    pass
else
    fail "Next.js not found"
fi

# ZeroMQ
check "ZeroMQ package"
if npm list zeromq 2>&1 | grep -q "zeromq@"; then
    pass
else
    warn "zeromq not installed (optional for real-time updates)"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2. CONFIGURATION FILES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# .env file
check ".env file exists"
if [ -f ".env" ]; then
    pass
else
    warn ".env not found (copy env.example)"
fi

# Required env vars
if [ -f ".env" ]; then
    check "VERUS_RPC_HOST configured"
    if grep -q "VERUS_RPC_HOST" .env; then
        pass
    else
        warn "VERUS_RPC_HOST not set"
    fi
    
    check "ENABLE_ZMQ configured"
    if grep -q "ENABLE_ZMQ" .env; then
        pass
    else
        warn "ENABLE_ZMQ not set (defaults to false)"
    fi
fi

# package.json
check "package.json exists"
if [ -f "package.json" ]; then
    pass
else
    fail "package.json missing"
fi

# tsconfig.json
check "tsconfig.json exists"
if [ -f "tsconfig.json" ]; then
    pass
else
    fail "tsconfig.json missing"
fi

# next.config.js
check "next.config.js exists"
if [ -f "next.config.js" ]; then
    pass
else
    fail "next.config.js missing"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3. CRITICAL FILES & DIRECTORIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# App directory
check "app/ directory"
if [ -d "app" ]; then
    pass
else
    fail "app/ directory missing"
fi

# Components
check "components/ directory"
if [ -d "components" ]; then
    pass
else
    fail "components/ directory missing"
fi

# Lib
check "lib/ directory"
if [ -d "lib" ]; then
    pass
else
    fail "lib/ directory missing"
fi

# Scripts
check "scripts/ directory"
if [ -d "scripts" ]; then
    pass
else
    fail "scripts/ directory missing"
fi

# Public
check "public/ directory"
if [ -d "public" ]; then
    pass
else
    warn "public/ directory missing"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4. BUILD & COMPILATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for TypeScript errors
check "TypeScript compilation"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
    warn "$ERROR_COUNT TypeScript errors found"
else
    pass
fi

# Check .next directory
check ".next build cache"
if [ -d ".next" ]; then
    pass
else
    warn ".next not found (run: npm run build)"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5. SERVICES & PROCESSES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for running processes
check "Development server"
if [ -f ".dev-server.lock" ]; then
    PID=$(cat .dev-server.lock 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d':' -f2)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        pass
    else
        warn "Stale lock file (run: npm run dev:stop)"
    fi
else
    echo -e " ${YELLOW}-${NC}"
fi

check "Production server"
if [ -f ".prod-server.lock" ]; then
    PID=$(cat .prod-server.lock 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d':' -f2)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        pass
    else
        warn "Stale lock file (run: npm run stop)"
    fi
else
    echo -e " ${YELLOW}-${NC}"
fi

# Check for port conflicts
check "Port 3000 availability"
if lsof -i :3000 > /dev/null 2>&1; then
    warn "Port 3000 in use"
else
    pass
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}6. EXTERNAL DEPENDENCIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Redis
check "Redis connectivity"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>&1 | grep -q "PONG"; then
        pass
    else
        warn "Redis not responding"
    fi
else
    warn "redis-cli not found (optional)"
fi

# PostgreSQL
check "PostgreSQL connectivity"
if command -v psql &> /dev/null; then
    if psql -h localhost -U verus_user -d verus_utxo_db -c "SELECT 1" > /dev/null 2>&1; then
        pass
    else
        warn "PostgreSQL not accessible (optional for some features)"
    fi
else
    warn "psql not found (optional)"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}7. SECURITY & BEST PRACTICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Git
check "Git repository"
if [ -d ".git" ]; then
    pass
else
    warn "Not a git repository"
fi

# .gitignore
check ".gitignore exists"
if [ -f ".gitignore" ]; then
    pass
else
    warn ".gitignore missing"
fi

# Lock files in gitignore
check "Lock files in .gitignore"
if grep -q "*.lock" .gitignore 2>/dev/null; then
    pass
else
    warn "Lock files may not be ignored"
fi

# .env in gitignore
check ".env in .gitignore"
if grep -q ".env" .gitignore 2>/dev/null; then
    pass
else
    fail ".env should be in .gitignore"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}8. DOCUMENTATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

check "README.md"
if [ -f "README.md" ]; then
    pass
else
    warn "README.md missing"
fi

check "Duplicate prevention docs"
if [ -f "DUPLICATE-PREVENTION.md" ]; then
    pass
else
    warn "Documentation may be incomplete"
fi

check "ZMQ documentation"
if [ -f "ZMQ-DEV-SETUP.md" ]; then
    pass
else
    warn "ZMQ docs missing"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}9. DEVELOPMENT SCRIPTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

check "Duplicate prevention scripts"
if [ -f "scripts/stop-all-services.sh" ] && [ -f "scripts/status-all-services.sh" ]; then
    pass
else
    fail "Management scripts missing"
fi

check "ZMQ status checker"
if [ -f "scripts/check-zmq-status.sh" ]; then
    pass
else
    warn "ZMQ checker missing"
fi

check "Scripts are executable"
UNEXECUTABLE=0
for script in scripts/*.sh; do
    if [ -f "$script" ] && [ ! -x "$script" ]; then
        UNEXECUTABLE=$((UNEXECUTABLE + 1))
    fi
done
if [ $UNEXECUTABLE -eq 0 ]; then
    pass
else
    warn "$UNEXECUTABLE scripts not executable"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Summary
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your development environment is ready! 🚀"
    echo ""
    echo "To start developing:"
    echo "  npm run dev"
    EXIT_CODE=0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}✅ ENVIRONMENT READY (with warnings)${NC}"
    echo ""
    echo "Your environment is functional but has some warnings."
    echo "Review warnings above and fix if needed."
    echo ""
    echo "To start developing:"
    echo "  npm run dev"
    EXIT_CODE=0
else
    echo -e "${RED}❌ ISSUES FOUND!${NC}"
    echo ""
    echo "Please fix the failed checks above before developing."
    echo ""
    echo "Common fixes:"
    echo "  • npm install           - Install dependencies"
    echo "  • cp env.example .env   - Create config file"
    echo "  • npm run build         - Build the project"
    EXIT_CODE=1
fi

echo ""
echo "For detailed checks:"
echo "  npm run services:status  - Check running services"
echo "  npm run zmq:check        - Check ZMQ configuration"
echo "  npx tsc --noEmit         - Check TypeScript errors"
echo ""

exit $EXIT_CODE




