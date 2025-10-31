#!/bin/bash

# Professional Project Cleanup
# Organizes temporary files and creates a clean root directory

set -e

cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════╗"
echo "║   CLEANING PROJECT FOR PRODUCTION         ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Create archive directory for temporary docs
mkdir -p docs/development-notes
mkdir -p docs/deployment-guides
mkdir -p docs/security
mkdir -p scripts/archived

echo "📁 Organizing documentation..."

# Move temporary/development docs to archive
mv APY-CALCULATION-ISSUE.md docs/development-notes/ 2>/dev/null || true
mv BROWSE-PAGE-STAKING-RULES.md docs/development-notes/ 2>/dev/null || true
mv CONFIGURATION_STATUS.md docs/development-notes/ 2>/dev/null || true
mv CONTINUOUS-SCANNING-SETUP.md docs/development-notes/ 2>/dev/null || true
mv CRITICAL-BUG-FIX-README.md docs/development-notes/ 2>/dev/null || true
mv DASHBOARD-TABS-MOBILE-FIXES.md docs/development-notes/ 2>/dev/null || true
mv DATABASE_PERMISSIONS_FIX.md docs/development-notes/ 2>/dev/null || true
mv DEPLOYMENT-READY.md docs/development-notes/ 2>/dev/null || true
mv DEPLOYMENT-STATUS.md docs/development-notes/ 2>/dev/null || true
mv DONT-TOUCH-THIS.md docs/development-notes/ 2>/dev/null || true
mv HIERARCHY-IMPROVEMENTS-SUMMARY.md docs/development-notes/ 2>/dev/null || true
mv I-ADDRESS-STAKING-RULE-IMPLEMENTATION.md docs/development-notes/ 2>/dev/null || true
mv IMPROVED_STAKING_SCANNER_README.md docs/development-notes/ 2>/dev/null || true
mv INSTALL-REDIS-PASSWORD.md docs/development-notes/ 2>/dev/null || true
mv LAST-STAKE-AUTOMATION.md docs/development-notes/ 2>/dev/null || true
mv LOADING-ISSUE-FIXED.md docs/development-notes/ 2>/dev/null || true
mv LOADING-STATES-CONSOLIDATION.md docs/development-notes/ 2>/dev/null || true
mv LOGO-ASSETS-FIXED.md docs/development-notes/ 2>/dev/null || true
mv MASTER_STAKING_SCANNER.md docs/development-notes/ 2>/dev/null || true
mv MOBILE-IMPROVEMENTS-PLAN.md docs/development-notes/ 2>/dev/null || true
mv MOBILE-PHASE-1-COMPLETE.md docs/development-notes/ 2>/dev/null || true
mv MOBILE-PHASE-2-COMPLETE.md docs/development-notes/ 2>/dev/null || true
mv MOBILE-TRANSFORMATION-COMPLETE.md docs/development-notes/ 2>/dev/null || true
mv NO-AUTH-CONFIG.md docs/development-notes/ 2>/dev/null || true
mv QUICK-START-STAKE-EXTRACTION.md docs/development-notes/ 2>/dev/null || true
mv RATE_LIMITER_ARCHITECTURE.md docs/development-notes/ 2>/dev/null || true
mv RATE_LIMITER_VERIFICATION.md docs/development-notes/ 2>/dev/null || true
mv README-STAKING-SCAN.md docs/development-notes/ 2>/dev/null || true
mv REDIS-SETUP-VERIFIED.md docs/development-notes/ 2>/dev/null || true
mv RUN-POS-INDEXER.md docs/development-notes/ 2>/dev/null || true
mv SCANNER-OPTIMIZED.md docs/development-notes/ 2>/dev/null || true
mv SIMPLIFIED_STAKING_DASHBOARD.md docs/development-notes/ 2>/dev/null || true
mv STAKE_EVENTS_LEGACY.md docs/development-notes/ 2>/dev/null || true
mv STAKE-AMOUNT-EXTRACTION.md docs/development-notes/ 2>/dev/null || true
mv STAKE-DETECTION-CONCERN.md docs/development-notes/ 2>/dev/null || true
mv STAKE-DETECTION-RESOLVED.md docs/development-notes/ 2>/dev/null || true
mv STAKE-TIMESTAMP-SOLUTION.md docs/development-notes/ 2>/dev/null || true
mv STAKING_MOMENTUM_REPLACEMENT.md docs/development-notes/ 2>/dev/null || true
mv STAKING_SCANNER_README.md docs/development-notes/ 2>/dev/null || true
mv STAKING_SCANNER_RULES.md docs/development-notes/ 2>/dev/null || true
mv STAKING-DATABASE-STATUS.md docs/development-notes/ 2>/dev/null || true
mv STAKING-LEADERBOARD-RULES.md docs/development-notes/ 2>/dev/null || true
mv START-HERE.md docs/development-notes/ 2>/dev/null || true
mv START-STAKING-SCAN-HERE.md docs/development-notes/ 2>/dev/null || true
mv STARTUP_CHECKLIST.md docs/development-notes/ 2>/dev/null || true
mv UI-AUDIT-REPORT.md docs/development-notes/ 2>/dev/null || true
mv ZMQ_ENABLED_SUCCESS.md docs/development-notes/ 2>/dev/null || true
mv ZMQ_HOW_IT_WORKS.md docs/development-notes/ 2>/dev/null || true

# Move deployment guides
mv DEPLOYMENT-GUIDE.md docs/deployment-guides/ 2>/dev/null || true
mv PRODUCTION-DEPLOYMENT.md docs/deployment-guides/ 2>/dev/null || true
mv database-setup-guide.md docs/deployment-guides/ 2>/dev/null || true
mv remote-daemon-guide.md docs/deployment-guides/ 2>/dev/null || true

# Move security docs
mv SECURITY-AUDIT-COMPLETE.md docs/security/ 2>/dev/null || true
mv SECURITY-AUDIT-REPORT.md docs/security/ 2>/dev/null || true
mv SECURITY-CHECKLIST.md docs/security/ 2>/dev/null || true
mv SECURITY-CONFIGURATION.md docs/security/ 2>/dev/null || true
mv SECURITY-IMPLEMENTATION-COMPLETE.md docs/security/ 2>/dev/null || true
mv SECURITY-IMPLEMENTATION.md docs/security/ 2>/dev/null || true

echo "🔧 Organizing setup scripts..."

# Move setup scripts to scripts directory (if not already there)
mv install-bootstrap.sh scripts/archived/ 2>/dev/null || true
mv install-verus-conf.sh scripts/archived/ 2>/dev/null || true
mv setup-autonomous-system.sh scripts/archived/ 2>/dev/null || true
mv setup-continuous-scanning.sh scripts/archived/ 2>/dev/null || true
mv setup-oink-methods.sh scripts/archived/ 2>/dev/null || true
mv setup-redis.sh scripts/archived/ 2>/dev/null || true
mv setup-remote-daemon.sh scripts/archived/ 2>/dev/null || true
mv setup-remote-zmq.sh scripts/archived/ 2>/dev/null || true
mv setup-secure-env.sh scripts/archived/ 2>/dev/null || true
mv setup-tools.sh scripts/archived/ 2>/dev/null || true
mv setup-verus-peers.sh scripts/archived/ 2>/dev/null || true
mv fix-redis-permanently.sh scripts/archived/ 2>/dev/null || true

# Move deployment scripts to scripts
mv deploy-production-optimized.sh scripts/ 2>/dev/null || true
mv deploy-to-production.sh scripts/ 2>/dev/null || true

echo "🗑️  Removing temporary files..."

# Remove auto-generated fix files
rm -f fix-configurations.sh
rm -f fix-view-ownership.sql
rm -f .config-locked

# Remove temporary config files
rm -f cron-jobs.txt
rm -f redis-permanent.conf
rm -f redis.service

# Remove duplicate/template configs (keep one canonical version)
rm -f verus.conf.custom
rm -f verus.conf.recommended
rm -f verus.conf.template
rm -f verus-remote.conf.template
# Keep: verus.conf.optimized, env.example, env.production.template

echo "📝 Creating professional README structure..."

# Create docs index
cat > docs/README.md << 'EODOCS'
# Documentation Index

## For Developers

### Getting Started
- [Main README](../README.md) - Start here
- [Deployment Guide](deployment-guides/DEPLOYMENT-GUIDE.md)
- [Database Setup](deployment-guides/database-setup-guide.md)

### Development Notes
See [development-notes/](development-notes/) for implementation details and historical context.

### Security
See [security/](security/) for security audits and configurations.

### API Documentation
See [API.md](../docs/API.md) if available.

EODOCS

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Project structure:"
echo "   Root: Clean and professional"
echo "   docs/development-notes: Development history"
echo "   docs/deployment-guides: Deployment documentation"
echo "   docs/security: Security documentation"
echo "   scripts/: All scripts organized"
echo "   scripts/archived/: Old setup scripts"
echo ""
echo "🎯 Your root directory is now professional and clean!"
echo ""

