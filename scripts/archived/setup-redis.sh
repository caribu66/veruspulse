#!/bin/bash

# Redis Setup Script for Verus Explorer
# This script installs and configures Redis for caching

set -e

echo "🚀 Setting up Redis for Verus Explorer..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v pacman &> /dev/null; then
        OS="arch"
    elif command -v apt-get &> /dev/null; then
        OS="debian"
    elif command -v yum &> /dev/null; then
        OS="redhat"
    else
        OS="unknown"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    OS="unknown"
fi

print_status "Detected OS: $OS"

# Install Redis
install_redis() {
    case $OS in
        "arch")
            print_status "Installing Redis on Arch Linux..."
            sudo pacman -S redis --noconfirm
            ;;
        "debian")
            print_status "Installing Redis on Debian/Ubuntu..."
            sudo apt update
            sudo apt install redis-server --yes
            ;;
        "redhat")
            print_status "Installing Redis on Red Hat/CentOS..."
            sudo yum install redis --assumeyes
            ;;
        "macos")
            print_status "Installing Redis on macOS..."
            if command -v brew &> /dev/null; then
                brew install redis
            else
                print_error "Homebrew not found. Please install Homebrew first."
                exit 1
            fi
            ;;
        *)
            print_error "Unsupported OS. Please install Redis manually."
            exit 1
            ;;
    esac
}

# Configure Redis
configure_redis() {
    print_status "Configuring Redis..."
    
    # Create Redis config directory if it doesn't exist
    sudo mkdir -p /etc/redis
    
    # Backup existing config if it exists
    if [ -f /etc/redis/redis.conf ]; then
        sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
        print_status "Backed up existing Redis config"
    fi
    
    # Create optimized Redis config for caching
    sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis configuration for Verus Explorer caching

# Network
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60

# General
daemonize yes
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence (disabled for cache-only usage)
save ""
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes

# Append only file (disabled for cache-only usage)
appendonly no

# Security
protected-mode yes
# requirepass your_redis_password_here

# Performance
tcp-backlog 511
databases 16

# Client management
maxclients 10000

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency monitoring
latency-monitor-threshold 100
EOF

    print_success "Redis configuration created"
}

# Create necessary directories and set permissions
setup_directories() {
    print_status "Setting up Redis directories..."
    
    # Create log directory
    sudo mkdir -p /var/log/redis
    sudo chown redis:redis /var/log/redis 2>/dev/null || sudo chown $(whoami):$(whoami) /var/log/redis
    
    # Create run directory
    sudo mkdir -p /var/run/redis
    sudo chown redis:redis /var/run/redis 2>/dev/null || sudo chown $(whoami):$(whoami) /var/run/redis
    
    print_success "Directories created and permissions set"
}

# Start Redis service
start_redis() {
    print_status "Starting Redis service..."
    
    case $OS in
        "arch"|"debian"|"redhat")
            sudo systemctl enable redis
            sudo systemctl start redis
            ;;
        "macos")
            brew services start redis
            ;;
    esac
    
    # Wait a moment for Redis to start
    sleep 2
    
    # Test Redis connection
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is running and responding to ping"
    else
        print_warning "Redis may not be running. Please check the service status."
    fi
}

# Test Redis installation
test_redis() {
    print_status "Testing Redis installation..."
    
    # Test basic operations
    redis-cli set test_key "test_value"
    if [ "$(redis-cli get test_key)" = "test_value" ]; then
        print_success "Redis read/write test passed"
    else
        print_error "Redis read/write test failed"
        exit 1
    fi
    
    # Clean up test key
    redis-cli del test_key
    
    # Test connection info
    print_status "Redis connection info:"
    redis-cli info server | grep -E "(redis_version|uptime_in_seconds|connected_clients)"
    
    print_success "Redis installation and configuration complete!"
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    if [ ! -f .env.local ]; then
        cat >> .env.local <<EOF

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache Configuration
ENABLE_CACHE=true
CACHE_TTL_BLOCKCHAIN=30
CACHE_TTL_BLOCK=300
CACHE_TTL_TRANSACTION=120
CACHE_TTL_ADDRESS=60
CACHE_TTL_MEMPOOL=10
EOF
        print_success "Environment file created with Redis configuration"
    else
        print_warning ".env.local already exists. Please add Redis configuration manually."
    fi
}

# Main installation process
main() {
    print_status "Starting Redis setup for Verus Explorer..."
    
    # Check if Redis is already installed
    if command -v redis-server &> /dev/null; then
        print_warning "Redis is already installed. Skipping installation."
    else
        install_redis
    fi
    
    configure_redis
    setup_directories
    start_redis
    test_redis
    create_env_file
    
    print_success "🎉 Redis setup complete!"
    print_status "Next steps:"
    echo "1. Restart your Next.js development server"
    echo "2. Test the cache API at http://localhost:3004/api/cache?action=health"
    echo "3. Check cache stats at http://localhost:3004/api/cache?action=stats"
    echo ""
    print_status "Redis management commands:"
    echo "• Start: sudo systemctl start redis (Linux) or brew services start redis (macOS)"
    echo "• Stop: sudo systemctl stop redis (Linux) or brew services stop redis (macOS)"
    echo "• Status: sudo systemctl status redis (Linux) or brew services list (macOS)"
    echo "• CLI: redis-cli"
    echo "• Monitor: redis-cli monitor"
}

# Run main function
main "$@"























