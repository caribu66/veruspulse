#!/bin/bash

# ============================================
# Verus Explorer - Production Deployment Script
# ============================================
# Deploys from laptop to PC with Verus daemon
# ============================================

# Configuration
PROD_HOST="192.168.86.89"
PROD_USER="build"
PROD_DIR="~/verus-explorer"
LOCAL_DIR="/home/build/verus-dapp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "🚀 Verus Explorer - Production Deployment"
echo "================================================"
echo ""
echo "Source:      $(hostname) (laptop)"
echo "Destination: $PROD_HOST (production PC)"
echo "Directory:   $PROD_DIR"
echo ""

# Check connectivity
echo "1️⃣  Checking connectivity to production PC..."
if ping -c 1 -W 2 $PROD_HOST > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production PC is reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach production PC at $PROD_HOST${NC}"
    echo "   Please check network connection"
    exit 1
fi

# Check SSH access
echo ""
echo "2️⃣  Checking SSH access..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "${PROD_USER}@${PROD_HOST}" 'exit' 2>/dev/null; then
    echo -e "${GREEN}✅ SSH access confirmed${NC}"
else
    echo -e "${YELLOW}⚠️  SSH requires password or key not configured${NC}"
    echo "   You may be prompted for password during deployment"
fi

# Ask for confirmation
echo ""
echo "================================================"
echo "📦 Ready to Deploy"
echo "================================================"
echo ""
echo "This will:"
echo "  • Build the application locally"
echo "  • Transfer files to production PC"
echo "  • Install/update dependencies"
echo "  • Restart the application"
echo ""
read -p "Continue with deployment? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Build locally
echo ""
echo "3️⃣  Building application locally..."
cd "$LOCAL_DIR" || exit 1

if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Create deployment package
echo ""
echo "4️⃣  Creating deployment package..."

TEMP_DIR=$(mktemp -d)
echo "   Temporary directory: $TEMP_DIR"

# Copy files (excluding development files)
rsync -a \
  --exclude='node_modules/' \
  --exclude='data/cache/' \
  --exclude='logs/' \
  --exclude='.git/' \
  --exclude='.next/cache/' \
  --exclude='.env.local' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='coverage/' \
  --exclude='test-results/' \
  "$LOCAL_DIR/" "$TEMP_DIR/"

echo -e "${GREEN}✅ Deployment package created${NC}"

# Transfer to production
echo ""
echo "5️⃣  Transferring files to production PC..."

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

# Remote setup and configuration
echo ""
echo "6️⃣  Setting up on production PC..."

ssh "${PROD_USER}@${PROD_HOST}" 'bash -s' << 'ENDSSH'
    set -e  # Exit on error
    
    cd ~/verus-explorer || exit 1
    
    echo "📦 Installing/updating dependencies..."
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found!"
        exit 1
    fi
    
    npm install --production
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        echo "⚠️  No .env.local found, creating from example..."
        if [ -f "env.example" ]; then
            cp env.example .env.local
            echo "⚠️  IMPORTANT: Edit .env.local with your settings!"
        else
            echo "❌ No env.example found!"
            exit 1
        fi
    fi
    
    # Check Redis
    echo "🔍 Checking Redis..."
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis not responding - install with: sudo apt-get install redis-server"
    fi
    
    # Check if PM2 is installed
    if command -v pm2 > /dev/null 2>&1; then
        echo "🔄 Restarting application with PM2..."
        
        # Check if app is already running
        if pm2 list | grep -q "verus-explorer"; then
            pm2 restart verus-explorer
            echo "✅ Application restarted"
        else
            pm2 start npm --name "verus-explorer" -- start
            pm2 save
            echo "✅ Application started"
        fi
    else
        echo "⚠️  PM2 not installed"
        echo "   Install with: npm install -g pm2"
        echo "   Or start manually with: npm start"
    fi
    
    echo ""
    echo "✅ Setup complete on production PC"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Remote setup successful${NC}"
else
    echo -e "${RED}❌ Remote setup failed${NC}"
    exit 1
fi

# Verify deployment
echo ""
echo "7️⃣  Verifying deployment..."
sleep 3

# Check if application is responding
if curl -s -f "http://${PROD_HOST}:3000/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Application is responding${NC}"
    
    # Check ZMQ status
    echo ""
    echo "🔍 Checking ZMQ status..."
    ZMQ_STATUS=$(curl -s "http://${PROD_HOST}:3000/api/zmq/status" | jq -r '.zmq.status' 2>/dev/null || echo "unknown")
    
    if [ "$ZMQ_STATUS" = "connected" ]; then
        echo -e "${GREEN}✅ ZMQ is connected${NC}"
    elif [ "$ZMQ_STATUS" = "not_installed" ]; then
        echo -e "${YELLOW}⚠️  ZMQ package not installed (optional feature)${NC}"
    else
        echo -e "${YELLOW}⚠️  ZMQ status: $ZMQ_STATUS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Application may still be starting...${NC}"
    echo "   Check status with: curl http://${PROD_HOST}:3000/api/health"
fi

# Final summary
echo ""
echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo ""
echo "Access your explorer:"
echo "  Local:  http://localhost:3000          (from production PC)"
echo "  Remote: http://${PROD_HOST}:3000        (from your laptop)"
echo ""
echo "Check status:"
echo "  curl http://${PROD_HOST}:3000/api/health"
echo "  curl http://${PROD_HOST}:3000/api/zmq/status"
echo "  curl http://${PROD_HOST}:3000/api/batch-info"
echo ""
echo "View logs:"
echo "  ssh ${PROD_USER}@${PROD_HOST} 'pm2 logs verus-explorer'"
echo ""
echo "Next steps:"
echo "  1. Configure .env.local on production PC if needed"
echo "  2. Setup ZMQ in VRSC.conf (see ZMQ-SETUP-GUIDE.md)"
echo "  3. Configure firewall if accessing from other devices"
echo ""
echo "For detailed instructions, see: DEPLOYMENT-GUIDE.md"
echo "================================================"



