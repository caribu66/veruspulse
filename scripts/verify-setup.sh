#!/bin/bash
# Quick verification script for VerusID service setup

set -e

echo "╔════════════════════════════════════════════╗"
echo "║   VerusID Service Setup Verification      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check 1: Environment file
echo "1️⃣  Checking environment configuration..."
if [ ! -f .env ]; then
  echo "   ⚠️  .env file not found. Please create from env.example"
  echo "   Run: cp env.example .env"
  echo "   Then edit with your settings"
  exit 1
fi

# Check required env vars
source .env
REQUIRED_VARS="DATABASE_URL VERUS_RPC_HOST VERUS_RPC_USER VERUS_RPC_PASSWORD"
MISSING=""
for VAR in $REQUIRED_VARS; do
  if [ -z "${!VAR}" ]; then
    MISSING="$MISSING $VAR"
  fi
done

if [ -n "$MISSING" ]; then
  echo "   ❌ Missing required environment variables:$MISSING"
  exit 1
fi

echo "   ✅ Environment configured"

# Check 2: PostgreSQL connection
echo ""
echo "2️⃣  Checking PostgreSQL connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "   ❌ Cannot connect to PostgreSQL"
  echo "   Check DATABASE_URL: $DATABASE_URL"
  exit 1
fi
echo "   ✅ PostgreSQL connected"

# Check 3: Database migrations
echo ""
echo "3️⃣  Checking database schema..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('identities', 'staking_rewards', 'identity_sync_state');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" != "3" ]; then
  echo "   ⚠️  Database schema not complete (found $TABLE_COUNT/3 tables)"
  echo "   Run: npm run run:migrate"
  exit 1
fi
echo "   ✅ Database schema ready"

# Check 4: verusd indexes
echo ""
echo "4️⃣  Checking verusd configuration..."
bash scripts/check-verusd-indexes.sh > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ verusd indexes enabled"
else
  echo "   ❌ verusd not properly configured"
  echo "   Run: bash scripts/check-verusd-indexes.sh"
  exit 1
fi

# Check 5: Node modules
echo ""
echo "5️⃣  Checking Node.js dependencies..."
if [ ! -d node_modules ]; then
  echo "   ⚠️  node_modules not found"
  echo "   Run: npm install"
  exit 1
fi

# Check for required modules
REQUIRED_MODULES="pg express helmet compression express-rate-limit node-fetch"
MISSING_MODULES=""
for MODULE in $REQUIRED_MODULES; do
  if [ ! -d "node_modules/$MODULE" ]; then
    MISSING_MODULES="$MISSING_MODULES $MODULE"
  fi
done

if [ -n "$MISSING_MODULES" ]; then
  echo "   ⚠️  Missing modules:$MISSING_MODULES"
  echo "   Run: npm install"
  exit 1
fi

echo "   ✅ Dependencies installed"

# Check 6: Service port availability
echo ""
echo "6️⃣  Checking service port..."
SERVICE_PORT=${SERVICE_PORT:-4001}
if lsof -Pi :$SERVICE_PORT -sTCP:LISTEN -t > /dev/null 2>&1; then
  echo "   ⚠️  Port $SERVICE_PORT is already in use"
  echo "   Service may already be running, or change SERVICE_PORT in .env"
else
  echo "   ✅ Port $SERVICE_PORT available"
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   ✅ Setup verification complete!          ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start the service:"
echo "   npm run service"
echo ""
echo "2. In another terminal, run tests:"
echo "   node test-verusid-service.js allbits@"
echo ""
echo "3. Try the API:"
echo "   curl -X POST http://localhost:$SERVICE_PORT/api/verusid/lookup \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"input\":\"allbits@\"}'"
echo ""

