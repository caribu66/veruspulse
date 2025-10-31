#!/bin/bash
# VerusPulse Production Deployment Script
# Deploys to www.veruspulse.com with Oink's efficient scanning methods

echo "🚀 Deploying VerusPulse to www.veruspulse.com..."
echo "=============================================="

# Configuration
PROJECT_DIR="/home/explorer/verus-dapp"
PRODUCTION_DIR="/var/www/veruspulse"
DOMAIN="www.veruspulse.com"
NGINX_CONFIG="/etc/nginx/sites-available/veruspulse"
NGINX_ENABLED="/etc/nginx/sites-enabled/veruspulse"
SSL_CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run as root (use sudo)"
        exit 1
    fi
}

# Install required packages
install_packages() {
    log "Installing required packages..."
    
    apt update
    apt install -y nginx certbot python3-certbot-nginx nodejs npm postgresql-client redis-server
    
    # Install PM2 for process management
    npm install -g pm2
    
    log "✅ Packages installed successfully"
}

# Create production directory structure
create_directories() {
    log "Creating production directory structure..."
    
    mkdir -p "$PRODUCTION_DIR"
    mkdir -p "$PRODUCTION_DIR/logs"
    mkdir -p "$PRODUCTION_DIR/backups"
    mkdir -p "/var/log/veruspulse"
    
    # Set proper permissions
    chown -R www-data:www-data "$PRODUCTION_DIR"
    chmod -R 755 "$PRODUCTION_DIR"
    
    log "✅ Directory structure created"
}

# Build the application
build_application() {
    log "Building VerusPulse application..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    npm ci --production
    
    # Build the application
    npm run build
    
    # Copy built files to production directory
    cp -r .next "$PRODUCTION_DIR/"
    cp -r public "$PRODUCTION_DIR/"
    cp -r scripts "$PRODUCTION_DIR/"
    cp -r lib "$PRODUCTION_DIR/"
    cp package*.json "$PRODUCTION_DIR/"
    cp next.config.js "$PRODUCTION_DIR/"
    cp .env.production "$PRODUCTION_DIR/.env" 2>/dev/null || cp .env.local "$PRODUCTION_DIR/.env"
    
    # Set proper permissions
    chown -R www-data:www-data "$PRODUCTION_DIR"
    
    log "✅ Application built and copied to production"
}

# Create production environment file
create_production_env() {
    log "Creating production environment configuration..."
    
    cat > "$PRODUCTION_DIR/.env" << EOF
# VerusPulse Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://$DOMAIN

# VerusCoin Daemon Configuration
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=your_secure_production_password_here
VERUS_RPC_TIMEOUT=10000

# ZMQ Configuration
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:28332
ENABLE_ZMQ=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# Database Configuration
DATABASE_URL=postgres://verus_user:verus_secure_2024@127.0.0.1:5432/verus_utxo_db

# Security Configuration - CRITICAL: Use strong, unique secrets
JWT_SECRET=your_jwt_secret_key_here_min_64_chars_for_production
CSRF_SECRET=your_csrf_secret_key_here_min_32_chars
SESSION_SECRET=your_session_secret_key_here_min_32_chars
SECRETS_MASTER_KEY=your_master_key_for_encrypting_secrets_min_128_chars

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_WINDOW_MS=300000
RATE_LIMIT_AUTH_MAX_REQUESTS=20

# Cache Configuration
CACHE_TTL_BLOCKCHAIN=30
CACHE_TTL_BLOCK=300
CACHE_TTL_TRANSACTION=120
CACHE_TTL_ADDRESS=60
CACHE_TTL_MEMPOOL=10

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/veruspulse/verus-explorer.log

# Performance Configuration
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_COMPRESSION=true
ENABLE_PERFORMANCE_MONITORING=true

# Monitoring Configuration
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=60000

# Security Monitoring
ENABLE_SECURITY_MONITORING=true
SECURITY_ALERT_EMAIL=admin@veruspulse.com
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EOF

    # Set proper permissions
    chown www-data:www-data "$PRODUCTION_DIR/.env"
    chmod 600 "$PRODUCTION_DIR/.env"
    
    log "✅ Production environment configuration created"
}

# Create PM2 ecosystem file
create_pm2_config() {
    log "Creating PM2 ecosystem configuration..."
    
    cat > "$PRODUCTION_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'veruspulse-web',
      script: 'npm',
      args: 'start',
      cwd: '$PRODUCTION_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/veruspulse/web-error.log',
      out_file: '/var/log/veruspulse/web-out.log',
      log_file: '/var/log/veruspulse/web-combined.log',
      time: true
    },
    // Note: Background scanners removed - using cron for active-iaddress-scanner instead
    // For historical backfills, run standalone-staking-scanner.js manually when needed
  ]
};
EOF

    log "✅ PM2 ecosystem configuration created"
}

# Create Nginx configuration
create_nginx_config() {
    log "Creating Nginx configuration..."
    
    cat > "$NGINX_CONFIG" << EOF
# VerusPulse Nginx Configuration
server {
    listen 80;
    server_name $DOMAIN veruspulse.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN veruspulse.com;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT_DIR/fullchain.pem;
    ssl_certificate_key $SSL_CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.verus.io;" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate Limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/s;
    
    # Main application
    location / {
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @proxy;
    }
    
    # Fallback for static files
    location @proxy {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|pid)$ {
        deny all;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/api/health;
    }
}
EOF

    # Enable the site
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    log "✅ Nginx configuration created and enabled"
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate..."
    
    # Stop nginx temporarily
    systemctl stop nginx
    
    # Get SSL certificate
    certbot certonly --standalone -d "$DOMAIN" -d "veruspulse.com" --non-interactive --agree-tos --email admin@veruspulse.com
    
    if [ $? -eq 0 ]; then
        log "✅ SSL certificate obtained successfully"
    else
        warning "SSL certificate setup failed. You may need to set it up manually."
    fi
    
    # Start nginx
    systemctl start nginx
}

# Setup Oink's method cron jobs for production
setup_production_cron() {
    log "Setting up Oink's method cron jobs for production..."
    
    # Create production cron jobs
    cat > /etc/cron.d/veruspulse-production << EOF
# VerusPulse Production Cron Jobs - Oink's Methods
# Active I-Address Scanner - runs every hour
0 * * * * www-data cd $PRODUCTION_DIR && /usr/bin/node scripts/active-iaddress-scanner.js >> $PRODUCTION_DIR/logs/stake-update.log 2>&1

# Calculate trending scores every hour
0 * * * * www-data cd $PRODUCTION_DIR && node scripts/calculate-trending-scores.js >> $PRODUCTION_DIR/logs/trending-scores.log 2>&1

# Clean up old history daily at midnight
0 0 * * * www-data cd $PRODUCTION_DIR && node scripts/cleanup-history.js >> $PRODUCTION_DIR/logs/cleanup-history.log 2>&1

# Oink's Method Autonomous Scanner System
*/2 * * * * www-data $PRODUCTION_DIR/scripts/oink-autonomous-scanner.sh manage >> $PRODUCTION_DIR/logs/oink-autonomous-cron.log 2>&1
0 */6 * * * www-data $PRODUCTION_DIR/scripts/oink-autonomous-scanner.sh health >> $PRODUCTION_DIR/logs/oink-health-reports.log 2>&1
0 3 * * 0 www-data $PRODUCTION_DIR/scripts/oink-autonomous-scanner.sh emergency >> $PRODUCTION_DIR/logs/oink-weekly-recovery.log 2>&1
*/30 * * * * www-data $PRODUCTION_DIR/scripts/generate-dashboard.sh >> $PRODUCTION_DIR/logs/dashboard-updates.log 2>&1

# Log rotation
0 2 * * * root find $PRODUCTION_DIR/logs -name "*.log" -mtime +7 -delete
0 2 * * * root find /var/log/veruspulse -name "*.log" -mtime +30 -delete
EOF

    # Set proper permissions
    chmod 644 /etc/cron.d/veruspulse-production
    
    log "✅ Production cron jobs configured"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start PM2 processes
    cd "$PRODUCTION_DIR"
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u www-data --hp /var/www
    
    # Start and enable nginx
    systemctl enable nginx
    systemctl restart nginx
    
    # Start and enable redis
    systemctl enable redis-server
    systemctl start redis-server
    
    log "✅ Services started successfully"
}

# Create deployment script
create_deployment_script() {
    log "Creating deployment script for future updates..."
    
    cat > "$PRODUCTION_DIR/deploy.sh" << 'EOF'
#!/bin/bash
# VerusPulse Production Deployment Script

echo "🚀 Deploying VerusPulse update to production..."

# Configuration
PROJECT_DIR="/home/explorer/verus-dapp"
PRODUCTION_DIR="/var/www/veruspulse"

# Build and deploy
cd "$PROJECT_DIR"
git pull origin main
npm ci --production
npm run build

# Copy to production
cp -r .next "$PRODUCTION_DIR/"
cp -r public "$PRODUCTION_DIR/"
cp -r scripts "$PRODUCTION_DIR/"
cp -r lib "$PRODUCTION_DIR/"

# Restart services
cd "$PRODUCTION_DIR"
pm2 restart all

echo "✅ Deployment complete!"
EOF

    chmod +x "$PRODUCTION_DIR/deploy.sh"
    chown www-data:www-data "$PRODUCTION_DIR/deploy.sh"
    
    log "✅ Deployment script created"
}

# Main deployment function
main() {
    log "Starting VerusPulse production deployment..."
    
    check_root
    install_packages
    create_directories
    build_application
    create_production_env
    create_pm2_config
    create_nginx_config
    setup_ssl
    setup_production_cron
    start_services
    create_deployment_script
    
    log "🎉 VerusPulse production deployment complete!"
    echo ""
    echo "📊 Your VerusPulse blockchain explorer is now live at:"
    echo "   🌐 https://$DOMAIN"
    echo ""
    echo "🔧 Management commands:"
    echo "   • Check status: pm2 status"
    echo "   • View logs: pm2 logs"
    echo "   • Restart: pm2 restart all"
    echo "   • Deploy update: $PRODUCTION_DIR/deploy.sh"
    echo ""
    echo "📊 Oink's Method Scanners:"
    echo "   • Staking Scanner: pm2 logs oink-staking-scanner"
    echo "   • Ultra-Fast Scanner: pm2 logs oink-ultra-scanner"
    echo "   • Hybrid Scanner: pm2 logs oink-hybrid-scanner"
    echo ""
    echo "🎯 Your blockchain explorer is now running with Oink's efficient methods!"
}

# Run main function
main "$@"