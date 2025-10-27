#!/bin/bash
###############################################################################
# test-stats-automation.sh
# Test script for statistics automation
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🧪 Testing VerusID Statistics Automation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Check if scripts exist and are executable
echo -e "${YELLOW}📋 Test 1: Checking script files...${NC}"
scripts=(
    "auto-recalculate-stats.js"
    "recalculate-stats.sh"
    "setup-auto-stats-recalc.sh"
    "setup-cron-stats-recalc.sh"
    "setup-stats-automation.sh"
)

for script in "${scripts[@]}"; do
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        if [[ -x "$SCRIPT_DIR/$script" ]]; then
            echo -e "  ✅ $script (executable)"
        else
            echo -e "  ⚠️  $script (not executable)"
            chmod +x "$SCRIPT_DIR/$script"
            echo -e "  ✅ $script (made executable)"
        fi
    else
        echo -e "  ❌ $script (missing)"
    fi
done

# Test 2: Check database connectivity
echo -e "\n${YELLOW}📋 Test 2: Checking database connectivity...${NC}"
if PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT COUNT(*) FROM verusid_statistics;" >/dev/null 2>&1; then
    echo -e "  ✅ Database connection successful"
    
    # Get current statistics count
    count=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c "SELECT COUNT(*) FROM verusid_statistics;" | tr -d ' ')
    echo -e "  📊 Current VerusIDs in statistics: $count"
else
    echo -e "  ❌ Database connection failed"
    echo -e "  💡 Make sure PostgreSQL is running and credentials are correct"
fi

# Test 3: Test manual statistics recalculation
echo -e "\n${YELLOW}📋 Test 3: Testing manual statistics recalculation...${NC}"
if [[ -f "$SCRIPT_DIR/recalculate-stats.sh" ]]; then
    echo -e "  🔄 Running statistics recalculation..."
    if "$SCRIPT_DIR/recalculate-stats.sh" >/dev/null 2>&1; then
        echo -e "  ✅ Statistics recalculation successful"
    else
        echo -e "  ❌ Statistics recalculation failed"
    fi
else
    echo -e "  ❌ Statistics recalculation script not found"
fi

# Test 4: Check for existing automation
echo -e "\n${YELLOW}📋 Test 4: Checking existing automation...${NC}"

# Check systemd service
if systemctl list-units --full -all 2>/dev/null | grep -q "verus-stats-recalc.service"; then
    echo -e "  ✅ Systemd service found"
    if systemctl is-active --quiet verus-stats-recalc.service 2>/dev/null; then
        echo -e "  ✅ Systemd service is running"
    else
        echo -e "  ⚠️  Systemd service is not running"
    fi
else
    echo -e "  ℹ️  No systemd service found"
fi

# Check cron job
if crontab -l 2>/dev/null | grep -q "cron-recalc-stats.sh"; then
    echo -e "  ✅ Cron job found"
    echo -e "  📅 Schedule: $(crontab -l | grep cron-recalc-stats.sh | cut -d' ' -f1-5)"
else
    echo -e "  ℹ️  No cron job found"
fi

# Test 5: Check log files
echo -e "\n${YELLOW}📋 Test 5: Checking log files...${NC}"
log_files=(
    "logs/auto-stats-recalc.log"
    "logs/cron-stats-recalc.log"
)

for log_file in "${log_files[@]}"; do
    if [[ -f "$PROJECT_DIR/$log_file" ]]; then
        echo -e "  ✅ $log_file exists"
        size=$(du -h "$PROJECT_DIR/$log_file" | cut -f1)
        echo -e "  📏 Size: $size"
    else
        echo -e "  ℹ️  $log_file not found (will be created when needed)"
    fi
done

# Test 6: Check API endpoint
echo -e "\n${YELLOW}📋 Test 6: Testing API endpoint...${NC}"
if curl -s "http://localhost:3000/api/verusids/browse?sort=recent&limit=1" >/dev/null 2>&1; then
    echo -e "  ✅ API endpoint accessible"
    
    # Get last refresh time
    last_refresh=$(curl -s "http://localhost:3000/api/verusids/browse?sort=recent&limit=1" | jq -r '.data.identities[0].lastRefreshed' 2>/dev/null || echo "unknown")
    echo -e "  🕒 Last refresh: $last_refresh"
else
    echo -e "  ❌ API endpoint not accessible"
    echo -e "  💡 Make sure the Next.js server is running on port 3000"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Test completed!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  • Run: ./scripts/setup-stats-automation.sh (interactive setup)"
echo "  • Or: ./scripts/setup-auto-stats-recalc.sh (systemd service)"
echo "  • Or: ./scripts/setup-cron-stats-recalc.sh (cron job)"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  • Read: scripts/README-STATS-AUTOMATION.md"
echo "  • Check status: systemctl status verus-stats-recalc"
echo "  • View logs: tail -f logs/auto-stats-recalc.log"
