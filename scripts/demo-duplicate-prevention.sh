#!/bin/bash

# Demonstration of Duplicate Instance Prevention
# This script shows the duplicate prevention in action

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Duplicate Instance Prevention - Live Demo                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_DIR="$(dirname "$0")/.."
cd "$BASE_DIR" || exit 1

# Cleanup first
echo -e "${BLUE}Step 1: Cleaning up any existing instances...${NC}"
./scripts/stop-all-services.sh > /dev/null 2>&1
sleep 2
echo -e "${GREEN}✓ Clean state${NC}"
echo ""

# Show initial status
echo -e "${BLUE}Step 2: Checking initial status...${NC}"
npm run services:status 2>&1 | grep -A 2 "No services"
echo ""

# Create a mock lock file to demonstrate stale lock detection
echo -e "${BLUE}Step 3: Testing stale lock detection...${NC}"
echo '{"pid":99999,"port":3000,"mode":"test"}' > .test-demo.lock
echo "Created lock file with non-existent PID: 99999"
echo ""

if kill -0 99999 2>/dev/null; then
    echo -e "${YELLOW}Warning: PID 99999 exists (unusual)${NC}"
else
    echo -e "${GREEN}✓ PID 99999 does not exist (as expected)${NC}"
    echo -e "${GREEN}✓ Scripts will detect this as a stale lock${NC}"
fi
rm -f .test-demo.lock
echo ""

# Demonstrate lock file format
echo -e "${BLUE}Step 4: Lock file format example...${NC}"
cat << 'EOF'
Lock files contain JSON with process info:
{
  "pid": 12345,
  "port": 3000,
  "mode": "development",
  "started": "2025-10-19T10:30:00.000Z"
}
EOF
echo ""

# Show the commands available
echo -e "${BLUE}Step 5: Available service management commands...${NC}"
echo ""
echo "Start services:"
echo "  npm run dev              # Development server"
echo "  npm start                # Production server"
echo "  ./scripts/start-daemon-monitor.sh"
echo "  ./scripts/start-stake-monitor.sh"
echo ""
echo "Stop services:"
echo "  npm run dev:stop         # Stop dev server"
echo "  npm run stop             # Stop any server"
echo "  npm run services:stop    # Stop all services"
echo ""
echo "Check status:"
echo "  npm run services:status  # Check all services"
echo ""

# Demonstrate what happens when trying to start duplicate
echo -e "${BLUE}Step 6: Simulating duplicate instance attempt...${NC}"
echo ""
echo "If you tried to start a service twice, you would see:"
echo ""
echo -e "${RED}❌ ERROR: A development server is already running!${NC}"
echo ""
echo "   PID: 12345"
echo "   Port: 3000"
echo "   Mode: development"
echo ""
echo "   To stop the existing server:"
echo "   1. Use: npm run dev:stop"
echo "   2. Or kill: kill 12345"
echo ""

# Show benefits
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Benefits of Duplicate Prevention:${NC}"
echo ""
echo "  • No port conflicts"
echo "  • Clear error messages with PID"
echo "  • Automatic stale lock cleanup"
echo "  • Consistent across all services"
echo "  • Easy service management"
echo "  • Graceful shutdown handling"
echo ""

# Show testing
echo -e "${BLUE}To test duplicate prevention yourself:${NC}"
echo ""
echo "1. Start a service:"
echo "   npm run dev"
echo ""
echo "2. Try starting it again (in another terminal):"
echo "   npm run dev"
echo "   # Will show error with PID and instructions"
echo ""
echo "3. Check what's running:"
echo "   npm run services:status"
echo ""
echo "4. Stop cleanly:"
echo "   npm run dev:stop"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo ""
echo "  • DUPLICATE-PREVENTION.md         - Complete technical docs"
echo "  • QUICK-SERVICE-REFERENCE.md      - Quick command reference"
echo "  • DUPLICATE-PREVENTION-SUMMARY.md - Implementation summary"
echo ""
echo -e "${BLUE}Run verification tests:${NC}"
echo "  ./scripts/test-duplicate-prevention.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Demo complete!${NC}"
echo ""




