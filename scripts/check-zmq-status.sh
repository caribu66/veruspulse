#!/bin/bash

# Check ZMQ Status
# This script checks if ZMQ is properly configured and working

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     ZMQ Configuration Status Check                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    
    # Check ENABLE_ZMQ setting
    if grep -q "ENABLE_ZMQ=true" .env; then
        echo -e "${GREEN}✓ ENABLE_ZMQ=true in .env${NC}"
    elif grep -q "ENABLE_ZMQ=false" .env; then
        echo -e "${YELLOW}⚠ ENABLE_ZMQ=false in .env (ZMQ disabled)${NC}"
    else
        echo -e "${YELLOW}⚠ ENABLE_ZMQ not set in .env${NC}"
    fi
    
    # Check ZMQ address
    if grep -q "VERUS_ZMQ_ADDRESS" .env; then
        ZMQ_ADDR=$(grep "VERUS_ZMQ_ADDRESS" .env | cut -d'=' -f2)
        echo -e "${GREEN}✓ VERUS_ZMQ_ADDRESS: $ZMQ_ADDR${NC}"
    else
        echo -e "${YELLOW}⚠ VERUS_ZMQ_ADDRESS not set in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo -e "${BLUE}💡 Copy env.example to .env: cp env.example .env${NC}"
fi

echo ""

# Check if zeromq is installed
echo -e "${BLUE}Checking ZMQ package installation...${NC}"
if npm list zeromq 2>&1 | grep -q "zeromq@"; then
    VERSION=$(npm list zeromq 2>&1 | grep "zeromq@" | awk '{print $2}')
    echo -e "${GREEN}✓ zeromq installed: $VERSION${NC}"
else
    echo -e "${RED}✗ zeromq package not installed${NC}"
    echo -e "${BLUE}💡 Install with: npm install zeromq${NC}"
fi

echo ""

# Check if Verus daemon is accessible
echo -e "${BLUE}Checking Verus daemon...${NC}"
if command -v verus &> /dev/null; then
    if verus getinfo &> /dev/null; then
        echo -e "${GREEN}✓ Verus daemon is running${NC}"
        
        # Check ZMQ notifications
        ZMQ_CHECK=$(verus getzmqnotifications 2>&1)
        if echo "$ZMQ_CHECK" | grep -q "address"; then
            echo -e "${GREEN}✓ ZMQ is configured in daemon${NC}"
            echo "$ZMQ_CHECK" | grep "address" | head -1
        else
            echo -e "${RED}✗ ZMQ not configured in daemon${NC}"
            echo -e "${BLUE}💡 Add to verus.conf:${NC}"
            echo "    zmqpubhashblock=tcp://127.0.0.1:28332"
            echo "    zmqpubhashtx=tcp://127.0.0.1:28332"
            echo "    zmqpubrawblock=tcp://127.0.0.1:28332"
            echo "    zmqpubrawtx=tcp://127.0.0.1:28332"
        fi
    else
        echo -e "${RED}✗ Verus daemon not responding${NC}"
    fi
else
    echo -e "${YELLOW}⚠ verus command not found${NC}"
    echo -e "${BLUE}💡 Using remote daemon? Check RPC connectivity${NC}"
fi

echo ""

# Check if server is running and ZMQ is active
echo -e "${BLUE}Checking if app server is running...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ App server is running${NC}"
    
    HEALTH=$(curl -s http://localhost:3000/api/health)
    if echo "$HEALTH" | grep -q "zmq"; then
        if echo "$HEALTH" | grep -q '"connected":true'; then
            echo -e "${GREEN}✓ ZMQ is connected and working!${NC}"
        else
            echo -e "${YELLOW}⚠ ZMQ not connected (check daemon config)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ App server not running${NC}"
    echo -e "${BLUE}💡 Start with: npm run dev${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  • ZMQ-DEV-SETUP.md - Complete setup guide"
echo "  • ZMQ_HOW_IT_WORKS.md - Technical details"
echo ""
echo -e "${BLUE}🔧 Quick fixes:${NC}"
echo "  • Install ZMQ: npm install zeromq"
echo "  • Configure .env: cp env.example .env"
echo "  • Start server: npm run dev"
echo ""




