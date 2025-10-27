#!/bin/bash

# ============================================
# Verus Explorer - Optimized Production Deployment
# ============================================
# Fast production deployment without dev overhead
# ============================================

# Configuration
PROD_HOST="192.168.1.102"
PROD_USER="explorer"
PROD_DIR="~/verus-dapp"
LOCAL_DIR="/home/explorer/verus-dapp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "🚀 Verus Explorer - Optimized Production Deploy"
echo "================================================"
echo ""
echo "Source:      $(hostname)"
echo "Destination: $PROD_HOST"
echo "Directory:   $PROD_DIR"
echo ""

# Check connectivity
echo "1️⃣  Checking connectivity..."
if ping -c 1 -W 2 $PROD_HOST > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production server is reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach production server at $PROD_HOST${NC}"
    exit 1
fi

# Production build with optimizations
echo ""
echo "2️⃣  Building optimized production bundle..."
cd "$LOCAL_DIR" || exit 1

# Clean previous builds
echo "   Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install ALL dependencies (needed for build)
echo "   Installing dependencies (including dev for build)..."
npm ci --silent

# Build with production optimizations
echo "   Building application..."
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Create optimized deployment package
echo ""
echo "3️⃣  Creating deployment package..."

TEMP_DIR=$(mktemp -d)
echo "   Temporary directory: $TEMP_DIR"

# Copy only production files
rsync -a \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.next/cache/' \
  --exclude='.env.local' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='coverage/' \
  --exclude='test-results/' \
  --exclude='load-tests/' \
  --exclude='scripts/dev-*' \
  --exclude='*.test.*' \
  --exclude='*.spec.*' \
  --exclude='jest.config.*' \
  --exclude='playwright.config.*' \
  --exclude='.playwright/' \
  "$LOCAL_DIR/" "$TEMP_DIR/"

echo -e "${GREEN}✅ Deployment package created${NC}"

# Transfer to production
echo ""
echo "4️⃣  Transferring to production server..."

if rsync -avz --progress \
  "$TEMP_DIR/" \
  "${PROD_USER}@${PROD_HOST}:${PROD_DIR}/"; then
    echo -e "${GREEN}✅ Files transferred successfully${NC}"
else
    echo -e "${RED}❌ File transfer failed${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Remote production setup
echo ""
echo "5️⃣  Setting up production environment..."

ssh "${PROD_USER}@${PROD_HOST}" 'bash -s' << 'ENDSSH'
    set -e
    
    cd ~/verus-dapp || exit 1
    
    echo "📦 Installing production dependencies..."
    npm ci --production --silent
    
    # Create production .env if it doesn't exist
    if [ ! -f ".env.production" ]; then
        echo "🔧 Creating production environment file..."
        cat > .env.production << 'ENVEOF'
# VerusCoin Daemon Configuration
VERUS_RPC_HOST=http://192.168.1.102:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb
VERUS_RPC_TIMEOUT=15000

# ZMQ Configuration
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:28332
ENABLE_ZMQ=true

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://192.168.1.102:3000

# Performance & Caching
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_COMPRESSION=true
CACHE_TTL_BLOCKCHAIN=30
CACHE_TTL_BLOCK=300
CACHE_TTL_TRANSACTION=120

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here-32-chars-min
ENVEOF
        echo "⚠️  IMPORTANT: Update .env.production with your actual JWT_SECRET!"
    fi
    
    # Check Redis
    echo "🔍 Checking Redis..."
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis not responding - starting service..."
        sudo systemctl start redis-server || echo "Redis service not found"
    fi
    
    # Check if PM2 is installed
    if command -v pm2 > /dev/null 2>&1; then
        echo "🔄 Managing application with PM2..."
        
        # Stop existing process if running
        pm2 delete verus-explorer 2>/dev/null || true
        
        # Start with production environment
        pm2 start npm --name "verus-explorer" -- start
        pm2 save
        pm2 startup systemd -u explorer --hp /home/explorer 2>/dev/null || true
        
        echo "✅ Application started with PM2"
    else
        echo "⚠️  PM2 not installed - installing..."
        npm install -g pm2
        pm2 start npm --name "verus-explorer" -- start
        pm2 save
        echo "✅ PM2 installed and application started"
    fi
    
    echo ""
    echo "✅ Production setup complete"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production setup successful${NC}"
else
    echo -e "${RED}❌ Production setup failed${NC}"
    exit 1
fi

# Verify deployment
echo ""
echo "6️⃣  Verifying deployment..."
sleep 5

# Check application health
HEALTH_URL="http://${PROD_HOST}:3000/api/health"
if curl -s -f "$HEALTH_URL" > /dev/null; then
    echo -e "${GREEN}✅ Application is responding${NC}"
    
    # Get status info
    echo ""
    echo "📊 Application Status:"
    curl -s "$HEALTH_URL" | jq '.' 2>/dev/null || curl -s "$HEALTH_URL"
    
else
    echo -e "${YELLOW}⚠️  Application may still be starting...${NC}"
    echo "   Check status with: curl $HEALTH_URL"
fi

# Final summary
echo ""
echo "================================================"
echo "🎉 Production Deployment Complete!"
echo "================================================"
echo ""
echo "Access your explorer:"
echo "  Local:  http://localhost:3000"
echo "  Remote: http://${PROD_HOST}:3000"
echo ""
echo "Production URLs:"
echo "  Health:  http://${PROD_HOST}:3000/api/health"
echo "  Status:  http://${PROD_HOST}:3000/api/batch-info"
echo "  ZMQ:     http://${PROD_HOST}:3000/api/zmq/status"
echo ""
echo "Management commands:"
echo "  ssh ${PROD_USER}@${PROD_HOST} 'pm2 logs verus-explorer'"
echo "  ssh ${PROD_USER}@${PROD_HOST} 'pm2 restart verus-explorer'"
echo "  ssh ${PROD_USER}@${PROD_HOST} 'pm2 status'"
echo ""
echo "Next steps:"
echo "  1. Update JWT_SECRET in .env.production if needed"
echo "  2. Configure firewall: sudo ufw allow 3000/tcp"
echo "  3. Setup SSL/HTTPS if needed"
echo ""
echo "================================================"




