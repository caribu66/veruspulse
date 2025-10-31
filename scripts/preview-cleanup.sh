#!/bin/bash

# Preview what will be cleaned up
# Shows you what will move/delete BEFORE doing it

cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════╗"
echo "║   CLEANUP PREVIEW                         ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

echo "📊 CURRENT ROOT DIRECTORY STATUS:"
echo ""
echo "Documentation files: $(find . -maxdepth 1 -type f -name "*.md" | wc -l) files"
echo "Shell scripts: $(find . -maxdepth 1 -type f -name "*.sh" | wc -l) files"
echo "SQL files: $(find . -maxdepth 1 -type f -name "*.sql" | wc -l) files"
echo "Config files: $(find . -maxdepth 1 -type f -name "*.conf" -o -name "*.txt" | wc -l) files"
echo ""

echo "📁 WHAT WILL BE MOVED:"
echo ""
echo "To docs/development-notes/:"
ls -1 APY-CALCULATION-ISSUE.md BROWSE-PAGE-STAKING-RULES.md CONFIGURATION_STATUS.md \
   CONTINUOUS-SCANNING-SETUP.md CRITICAL-BUG-FIX-README.md DASHBOARD-TABS-MOBILE-FIXES.md \
   2>/dev/null | head -10
echo "   ... and 40+ more development docs"
echo ""

echo "To docs/deployment-guides/:"
ls -1 DEPLOYMENT-GUIDE.md PRODUCTION-DEPLOYMENT.md database-setup-guide.md 2>/dev/null
echo ""

echo "To docs/security/:"
ls -1 SECURITY-*.md 2>/dev/null
echo ""

echo "To scripts/archived/:"
ls -1 setup-*.sh install-*.sh fix-*.sh 2>/dev/null | head -5
echo "   ... and more setup scripts"
echo ""

echo "🗑️  WHAT WILL BE DELETED:"
echo "   - fix-configurations.sh (temporary)"
echo "   - fix-view-ownership.sql (temporary)"
echo "   - .config-locked (temporary)"
echo "   - cron-jobs.txt (temporary)"
echo "   - redis-permanent.conf (duplicate)"
echo "   - redis.service (duplicate)"
echo "   - verus.conf.custom (duplicate)"
echo "   - verus.conf.recommended (duplicate)"
echo "   - verus.conf.template (duplicate)"
echo ""

echo "✅ WHAT WILL STAY IN ROOT:"
echo "   - README.md (main documentation)"
echo "   - package.json, tsconfig.json, next.config.js (essential)"
echo "   - .env, env.example (configuration)"
echo "   - app/, components/, lib/ (application code)"
echo "   - scripts/, docs/ (organized)"
echo "   - verus.conf.optimized (recommended config)"
echo ""

echo "📋 AFTER CLEANUP:"
echo ""
echo "Root directory will have:"
echo "   ✅ ~10 essential files"
echo "   ✅ Core directories (app, components, lib, etc.)"
echo "   ✅ Clean, professional structure"
echo ""
echo "All historical docs moved to:"
echo "   📁 docs/development-notes/"
echo "   📁 docs/deployment-guides/"
echo "   📁 docs/security/"
echo "   📁 scripts/archived/"
echo ""

echo "🚀 To proceed with cleanup:"
echo "   ./scripts/cleanup-for-production.sh"
echo ""
echo "💡 This is SAFE - files are moved, not deleted"
echo ""

