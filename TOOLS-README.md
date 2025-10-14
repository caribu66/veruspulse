# VerusCoin Explorer - Essential Tools & Setup Guide

## 🛠️ Required Tools for Production

### **Core Blockchain Tools**

- **VerusCoin Daemon (verusd)** - Primary blockchain data source
- **RPC Authentication** - Secure connection to verusd
- **Block Indexing** - Fast blockchain data retrieval

### **Database & Storage**

- **PostgreSQL** - Primary database for blockchain data
- **Redis** - Caching layer for performance
- **SQLite** - Local development database

### **Web Framework & Dependencies**

- **Next.js 15.5.4** - React framework ✅
- **TypeScript** - Type safety ✅
- **Tailwind CSS** - Styling framework ✅
- **Lucide React** - Icon library ✅

### **Production Infrastructure**

- **Docker** - Containerization
- **Nginx** - Reverse proxy and load balancing
- **PM2** - Process management
- **SSL Certificates** - HTTPS security

### **Monitoring & Security**

- **Winston** - Structured logging
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Health Checks** - Service monitoring

## 🚀 Quick Setup

### **1. Automated Setup (Recommended)**

```bash
# Run the automated setup script
./setup-tools.sh
```

### **2. Manual Setup**

#### **Install System Dependencies**

```bash
# Arch/Manjaro/CachyOS
sudo pacman -S postgresql redis nginx docker docker-compose

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib redis-server nginx docker.io docker-compose

# Enable services
sudo systemctl enable postgresql redis nginx
sudo systemctl start postgresql redis nginx
```

#### **Install Node.js Dependencies**

```bash
npm install
```

#### **Setup Database**

```bash
# Create database and user
sudo -u postgres createdb verus_explorer
sudo -u postgres createuser verus_user
sudo -u postgres psql -c "ALTER USER verus_user PASSWORD 'verus_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE verus_explorer TO verus_user;"
```

#### **Configure VerusCoin Daemon**

```bash
# Create verus.conf in your VerusCoin data directory
# Default locations:
# Linux: ~/.komodo/VRSC/verus.conf
# macOS: ~/Library/Application Support/Komodo/VRSC/verus.conf

# Copy the template and customize
cp verus.conf.template ~/.komodo/VRSC/verus.conf
```

## 🔧 Configuration Files

### **Environment Variables (.env.local)**

```bash
# VerusCoin Daemon
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=your_rpc_username
VERUS_RPC_PASSWORD=your_rpc_password

# Database
DATABASE_URL=postgresql://verus_user:verus_password@localhost:5432/verus_explorer
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_key
RATE_LIMIT_MAX_REQUESTS=100
```

### **VerusCoin Daemon (verus.conf)**

```ini
rpcuser=verus_rpc_user
rpcpassword=your_secure_password
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=18843
server=1
txindex=1
addressindex=1
timestampindex=1
spentindex=1
daemon=1
```

## 🏃‍♂️ Running the Explorer

### **Development Mode**

```bash
# Start all services
./scripts/start-dev.sh

# Or manually
npm run dev
```

### **Production Mode**

```bash
# Using Docker Compose
./scripts/start-prod.sh

# Or manually
npm run build
npm start
```

### **Health Checks**

```bash
# Check all services
./scripts/health-check.sh

# Check individual services
systemctl status postgresql redis nginx
docker-compose ps
```

## 📊 Monitoring & Maintenance

### **Log Files**

- **Application**: `logs/verus-explorer.log`
- **PostgreSQL**: `/var/log/postgresql/`
- **Redis**: `/var/log/redis/`
- **Nginx**: `/var/log/nginx/`

### **Database Maintenance**

```bash
# Backup database
pg_dump verus_explorer > backup_$(date +%Y%m%d).sql

# Restore database
psql verus_explorer < backup_20240101.sql

# Optimize database
psql verus_explorer -c "VACUUM ANALYZE;"
```

### **Cache Management**

```bash
# Clear Redis cache
redis-cli FLUSHALL

# Monitor Redis
redis-cli MONITOR
```

## 🔒 Security Considerations

### **Firewall Rules**

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 18843 # VerusCoin RPC (if external access needed)
```

### **SSL Certificates**

```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### **Rate Limiting**

- API endpoints are rate-limited to 10 requests/second
- Adjust limits in nginx.conf if needed
- Monitor for abuse patterns

## 🐛 Troubleshooting

### **Common Issues**

#### **VerusCoin Daemon Not Responding**

```bash
# Check if verusd is running
ps aux | grep verusd

# Check RPC connection
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"getblockchaininfo","params":[]}' \
  http://127.0.0.1:18843
```

#### **Database Connection Issues**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U verus_user -d verus_explorer -c "SELECT 1;"
```

#### **Redis Connection Issues**

```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping
```

### **Performance Optimization**

#### **Database Indexing**

```sql
-- Create indexes for common queries
CREATE INDEX idx_blocks_height ON blocks(height);
CREATE INDEX idx_transactions_txid ON transactions(txid);
CREATE INDEX idx_addresses_address ON addresses(address);
```

#### **Caching Strategy**

- Block data: 1 hour cache
- Transaction data: 30 minutes cache
- Address data: 5 minutes cache
- Network stats: 1 minute cache

## 📈 Scaling Considerations

### **High Traffic Setup**

- Use multiple Redis instances
- Implement database read replicas
- Add CDN for static assets
- Use load balancer for multiple app instances

### **Data Archiving**

- Archive old blocks to cold storage
- Implement data compression
- Set up automated backups
- Monitor disk usage

## 🆘 Support & Resources

### **VerusCoin Resources**

- [Official VerusCoin GitHub](https://github.com/veruscoin)
- [VerusCoin Documentation](https://github.com/veruscoin/VerusCoin/wiki)
- [VerusCoin Discord](https://discord.gg/VRKMP2S)

### **Development Resources**

- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

**Note**: This setup is optimized for production use. For development, you can use SQLite instead of PostgreSQL and skip some of the production tools.
