#!/bin/bash
# VerusPulse Production Startup Script

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     VerusPulse Production Startup                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

cd /home/explorer/verus-dapp

# 1. Check dependencies
echo "1️⃣  Checking dependencies..."

if ! systemctl is-active --quiet postgresql 2>/dev/null; then
  echo "   ⚠️  PostgreSQL not running (may need sudo to start)"
fi

if ! systemctl is-active --quiet redis-server 2>/dev/null; then
  echo "   ⚠️  Redis not running (may need sudo to start)"
fi

echo "   ✅ Dependency check complete"
echo ""

# 2. Test database
echo "2️⃣  Testing database connection..."
if PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d pos_db -c "SELECT 1;" > /dev/null 2>&1; then
  STAKE_COUNT=$(PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d pos_db -t -c "SELECT COUNT(*) FROM staking_rewards;" | tr -d ' ')
  echo "   ✅ Database connected (pos_db) - $STAKE_COUNT stakes"
else
  echo "   ❌ Database connection failed!"
  exit 1
fi
echo ""

# 3. Check build
echo "3️⃣  Checking production build..."
if [ ! -d ".next" ]; then
  echo "   🔨 Building production bundle..."
  NODE_ENV=production npm run build
else
  echo "   ✅ Production build exists"
fi
echo ""

# 4. Start PM2
echo "4️⃣  Starting PM2..."
pm2 delete veruspulse 2>/dev/null
pm2 start ecosystem.config.js
sleep 5
echo ""

# 5. Verify health
echo "5️⃣  Checking health..."
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null | jq -r '.data.overall' 2>/dev/null)

if [ "$HEALTH" == "healthy" ]; then
  echo "   ✅ System healthy!"
else
  echo "   ⚠️  Health check: $HEALTH (may need a moment to fully start)"
fi
echo ""

# 6. Check scanner
echo "6️⃣  Checking scanner..."
if crontab -l 2>/dev/null | grep -q "run-update-stakes"; then
  echo "   ✅ Scanner cron job active"
else
  echo "   ⚠️  Scanner cron job missing!"
fi
echo ""

# 7. Save PM2
echo "7️⃣  Saving PM2 configuration..."
pm2 save > /dev/null 2>&1
echo "   ✅ PM2 configuration saved"
echo ""

# Final status
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                 🎉 STARTUP COMPLETE!                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
pm2 status
echo ""
echo "🌐 Your site is live at:"
echo "   • Local:  http://localhost:3000"
echo "   • Public: https://www.veruspulse.com"
echo ""
echo "📊 Monitor:"
echo "   • PM2 logs:    pm2 logs veruspulse"
echo "   • Scanner:     tail -f /tmp/stake-updates.log"
echo "   • Health:      curl http://localhost:3000/api/health | jq ."
echo ""
