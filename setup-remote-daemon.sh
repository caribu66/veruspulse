#!/bin/bash

# Setup script for remote Verus daemon configuration
# This script helps configure both the daemon server and the development client

set -e

echo "🚀 Verus Remote Daemon Setup"
echo "============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Get user input
echo "Please provide the following information:"
echo ""

# Get remote server IP
read -p "Enter the IP address of your daemon server: " REMOTE_IP
if [[ ! $REMOTE_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    print_error "Invalid IP address format"
    exit 1
fi

# Get network range
read -p "Enter your network range (e.g., 192.168.1.0/24): " NETWORK_RANGE
if [[ ! $NETWORK_RANGE =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    print_error "Invalid network range format"
    exit 1
fi

# Get RPC credentials
read -p "Enter RPC username (default: verus): " RPC_USER
RPC_USER=${RPC_USER:-verus}

read -s -p "Enter RPC password: " RPC_PASSWORD
echo ""
if [ -z "$RPC_PASSWORD" ]; then
    print_error "RPC password cannot be empty"
    exit 1
fi

echo ""
print_info "Configuration Summary:"
echo "  Remote Server IP: $REMOTE_IP"
echo "  Network Range: $NETWORK_RANGE"
echo "  RPC User: $RPC_USER"
echo "  RPC Password: [HIDDEN]"
echo ""

read -p "Is this correct? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    print_info "Setup cancelled"
    exit 0
fi

echo ""
print_info "Creating configuration files..."

# Create remote daemon configuration
cat > verus-remote.conf << EOF
# VerusCoin Daemon Configuration - Remote Access Setup
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$NETWORK_RANGE
rpchost=0.0.0.0
rpcbind=0.0.0.0
rpcport=18843
server=1
rpcworkqueue=256

# Essential Indexes for Explorer Functionality
txindex=1
addressindex=1
timestampindex=1
spentindex=1
identityindex=1

# Performance Optimizations
dbcache=2048
maxmempool=512
maxconnections=40
maxuploadtarget=0
minrelaytxfee=0.00001

# Network Configuration
listen=1
bind=0.0.0.0

daemon=1
EOF

# Create development environment configuration
cat > .env.remote << EOF
# VerusCoin Daemon Configuration - Remote Server
VERUS_RPC_HOST=http://$REMOTE_IP:18843
VERUS_RPC_USER=$RPC_USER
VERUS_RPC_PASSWORD=$RPC_PASSWORD
VERUS_RPC_TIMEOUT=15000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3004

# Security Configuration
JWT_SECRET=your_jwt_secret_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL_BLOCKCHAIN=30
CACHE_TTL_BLOCK=300
CACHE_TTL_TRANSACTION=120
CACHE_TTL_ADDRESS=60
CACHE_TTL_MEMPOOL=10

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/verus-explorer.log

# Performance Configuration
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_COMPRESSION=true
ENABLE_PERFORMANCE_MONITORING=true

# Sentry Configuration
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Monitoring Configuration
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=60000
EOF

print_status "Configuration files created successfully!"

echo ""
print_info "Next Steps:"
echo ""
echo "1. 🖥️  ON YOUR DAEMON SERVER ($REMOTE_IP):"
echo "   - Copy 'verus-remote.conf' to your daemon server"
echo "   - Place it in ~/.komodo/VRSC/verus.conf"
echo "   - Restart your verusd daemon"
echo "   - Configure firewall to allow port 18843"
echo ""
echo "2. 💻 ON THIS DEVELOPMENT MACHINE:"
echo "   - Copy .env.remote to .env.local"
echo "   - Test the connection with: npm run test:remote-connection"
echo "   - Start your development server: npm run dev"
echo ""
echo "3. 🔒 SECURITY CONSIDERATIONS:"
echo "   - Change the default RPC password"
echo "   - Restrict network access using firewall rules"
echo "   - Consider using VPN for additional security"
echo ""

print_info "Files created:"
echo "  - verus-remote.conf (for daemon server)"
echo "  - .env.remote (for development machine)"
echo "  - setup-remote-daemon.sh (this script)"

print_status "Setup completed! 🎉"

