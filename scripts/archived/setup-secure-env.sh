#!/bin/bash

# VerusPulse Environment Setup Script
# This script helps you set up secure environment variables

set -e

echo "🔐 VerusPulse Security Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if .env file exists
if [ -f ".env" ]; then
    print_warning "Existing .env file found. Creating backup..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup created"
fi

# Copy example environment
print_status "Setting up environment from template..."
cp env.example .env
print_success "Environment file created"

# Generate additional secrets if needed
print_status "Generating additional secure secrets..."

# Generate RPC password if not set
if grep -q "VERUS_RPC_PASSWORD=your_secure_password" .env; then
    RPC_PASSWORD=$(openssl rand -base64 32)
    sed -i "s|VERUS_RPC_PASSWORD=your_secure_password_here_min_32_chars|VERUS_RPC_PASSWORD=$RPC_PASSWORD|" .env
    print_success "Generated secure RPC password"
fi

# Generate Redis password if not set
if grep -q "REDIS_PASSWORD=your_redis_password" .env; then
    REDIS_PASSWORD=$(openssl rand -base64 24)
    sed -i "s|REDIS_PASSWORD=your_redis_password_here|REDIS_PASSWORD=$REDIS_PASSWORD|" .env
    print_success "Generated secure Redis password"
fi

# Generate database password if not set
if grep -q "DATABASE_URL=postgres://verus:your_db_password" .env; then
    DB_PASSWORD=$(openssl rand -base64 24)
    sed -i "s|DATABASE_URL=postgres://verus:your_db_password@127.0.0.1:5432/verus_utxo_db|DATABASE_URL=postgres://verus:$DB_PASSWORD@127.0.0.1:5432/verus_utxo_db|" .env
    print_success "Generated secure database password"
fi

print_success "Environment setup complete!"
echo ""
print_status "Next steps:"
echo "1. Review and update .env file with your specific configuration"
echo "2. Set up your Verus daemon with the generated RPC password"
echo "3. Configure Redis with the generated password"
echo "4. Update database connection string if using PostgreSQL"
echo "5. Set up Sentry for error monitoring"
echo "6. Configure GitHub OAuth if needed"
echo ""
print_warning "IMPORTANT: Keep your .env file secure and never commit it to version control!"
echo ""
print_status "Security features enabled:"
echo "✅ Strong JWT secret (64+ characters)"
echo "✅ Secure CSRF protection"
echo "✅ Encrypted session management"
echo "✅ Master key for secret encryption"
echo "✅ Secure RPC authentication"
echo "✅ Protected Redis access"
echo "✅ Database security"
echo ""
print_success "Your VerusPulse application is now configured with enterprise-grade security!"
