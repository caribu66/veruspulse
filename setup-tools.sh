#!/bin/bash

# VerusCoin Explorer Setup Script
# This script installs and configures all necessary tools

set -e

echo "🚀 Setting up VerusCoin Explorer Tools..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# 1. Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# 2. Install system dependencies
print_status "Installing system dependencies..."

# Check if running on Arch-based system (Manjaro/CachyOS)
if command -v pacman &> /dev/null; then
    print_status "Detected Arch-based system, installing dependencies..."
    sudo pacman -S --needed postgresql redis nginx docker docker-compose
    
    # Enable services
    sudo systemctl enable postgresql
    sudo systemctl enable redis
    sudo systemctl start postgresql
    sudo systemctl start redis
    
elif command -v apt &> /dev/null; then
    print_status "Detected Debian-based system, installing dependencies..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib redis-server nginx docker.io docker-compose
    
    # Enable services
    sudo systemctl enable postgresql
    sudo systemctl enable redis-server
    sudo systemctl start postgresql
    sudo systemctl start redis-server
    
elif command -v dnf &> /dev/null; then
    print_status "Detected Red Hat-based system, installing dependencies..."
    sudo dnf install -y postgresql postgresql-server redis nginx docker docker-compose
    
    # Initialize and start PostgreSQL
    sudo postgresql-setup --initdb
    sudo systemctl enable postgresql
    sudo systemctl enable redis
    sudo systemctl start postgresql
    sudo systemctl start redis
else
    print_warning "Unknown package manager. Please install PostgreSQL, Redis, and Nginx manually."
fi

# 3. Setup PostgreSQL database
print_status "Setting up PostgreSQL database..."
sudo -u postgres createdb verus_explorer 2>/dev/null || print_warning "Database might already exist"
sudo -u postgres createuser verus_user 2>/dev/null || print_warning "User might already exist"
sudo -u postgres psql -c "ALTER USER verus_user PASSWORD 'verus_password';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE verus_explorer TO verus_user;" 2>/dev/null || true

# 4. Setup Redis
print_status "Configuring Redis..."
sudo systemctl restart redis

# 5. Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p data/cache
mkdir -p data/indexes
mkdir -p scripts

# 6. Setup VerusCoin daemon
print_status "Setting up VerusCoin daemon configuration..."

# Create verus.conf template
cat > verus.conf.template << EOF
# VerusCoin Daemon Configuration
rpcuser=verus_rpc_user
rpcpassword=$(openssl rand -base64 32)
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=18843
server=1
txindex=1
addressindex=1
timestampindex=1
spentindex=1
daemon=1
EOF

print_success "Created verus.conf.template with secure RPC credentials"

# 7. Create Docker Compose for production
print_status "Creating Docker Compose configuration..."
cat > docker-compose.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: verus_explorer
      POSTGRES_USER: verus_user
      POSTGRES_PASSWORD: verus_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://verus_user:verus_password@postgres:5432/verus_explorer
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
EOF

# 8. Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Rate limiting
        limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
        }
    }
}
EOF

# 9. Create Dockerfile
print_status "Creating Dockerfile..."
cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
EOF

# 10. Create development scripts
print_status "Creating development scripts..."

# Start development script
cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting VerusCoin Explorer in development mode..."

# Start Redis if not running
if ! pgrep redis-server > /dev/null; then
    echo "Starting Redis..."
    redis-server --daemonize yes
fi

# Start PostgreSQL if not running
if ! pgrep postgres > /dev/null; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Start the development server
npm run dev
EOF

chmod +x scripts/start-dev.sh

# Production start script
cat > scripts/start-prod.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting VerusCoin Explorer in production mode..."

# Start with Docker Compose
docker-compose up -d

echo "✅ Services started. Check status with: docker-compose ps"
EOF

chmod +x scripts/start-prod.sh

# Health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Checking VerusCoin Explorer health..."

# Check if services are running
services=("postgresql" "redis-server" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
done

# Check database connection
if command -v psql &> /dev/null; then
    if psql -h localhost -U verus_user -d verus_explorer -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
    fi
fi

# Check Redis connection
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis connection successful"
    else
        echo "❌ Redis connection failed"
    fi
fi
EOF

chmod +x scripts/health-check.sh

# 11. Create environment file
print_status "Creating environment configuration..."
cp verus-explorer.config.example .env.local

print_success "✅ Setup complete!"
print_status "Next steps:"
echo "1. Configure your VerusCoin daemon (verusd) with the generated verus.conf"
echo "2. Update .env.local with your actual credentials"
echo "3. Run './scripts/start-dev.sh' to start development"
echo "4. Run './scripts/health-check.sh' to verify everything is working"
echo ""
print_warning "Don't forget to:"
echo "- Set up SSL certificates for production"
echo "- Configure firewall rules"
echo "- Set up monitoring and logging"
echo "- Backup your database regularly"
