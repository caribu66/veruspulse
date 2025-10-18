# Deployment Guide - Deploy to PC with Verus Daemon

This guide covers deploying your Verus Explorer from your **development laptop** to the **PC where Verus daemon is running** (192.168.86.89).

---

## 📋 Overview

**Current Setup:**

- Development: Your laptop
- Daemon: PC at 192.168.86.89
- RPC: Remote connection

**After Deployment:**

- Production: PC at 192.168.86.89 (same as daemon)
- Daemon: Local on same machine
- RPC: Local connection (faster!)
- ZMQ: Local connection (real-time!)

---

## 🎯 Benefits of Co-location

Running the explorer on the same machine as the daemon provides:

✅ **Faster RPC calls** (localhost vs network)  
✅ **ZMQ real-time updates** (local connection)  
✅ **Lower latency** (no network overhead)  
✅ **Better security** (no RPC over network)  
✅ **Simpler setup** (everything local)

---

## 📦 Step 1: Prepare Deployment Package

On your **laptop**, create a deployment package:

```bash
# 1. Create deployment directory
mkdir -p ~/verus-explorer-deploy

# 2. Copy project (excluding dev files)
rsync -av \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data/cache' \
  --exclude='logs' \
  --exclude='.git' \
  --exclude='.env.local' \
  /home/build/verus-dapp/ \
  ~/verus-explorer-deploy/

# 3. Copy environment template
cp /home/build/verus-dapp/env.example ~/verus-explorer-deploy/.env.production

echo "✅ Deployment package ready at ~/verus-explorer-deploy"
```

---

## 🚀 Step 2: Transfer to Production PC

### Option A: Using SCP (Recommended)

```bash
# From your laptop, transfer the entire project
scp -r ~/verus-explorer-deploy build@192.168.86.89:~/verus-explorer

# Or use rsync for faster transfer
rsync -avz --progress \
  ~/verus-explorer-deploy/ \
  build@192.168.86.89:~/verus-explorer/
```

### Option B: Using Git (Alternative)

If you're using git:

```bash
# On laptop: Push to repository
git add .
git commit -m "Ready for deployment"
git push

# On PC: Clone repository
ssh build@192.168.86.89
cd ~
git clone YOUR_REPO_URL verus-explorer
cd verus-explorer
```

---

## 🔧 Step 3: Configure on Production PC

SSH into the production PC:

```bash
ssh build@192.168.86.89
cd ~/verus-explorer
```

### A. Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version

# If not, install Node.js 18+ (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### B. Install Dependencies

```bash
npm install --production
```

### C. Setup Redis (Required for caching)

```bash
# Install Redis
sudo apt-get update
sudo apt-get install -y redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping
# Should respond: PONG
```

### D. Configure Environment

```bash
# Copy and edit environment file
cp .env.production .env.local

# Edit with your settings
nano .env.local
```

Use these settings for **local daemon**:

```env
# VerusCoin Daemon Configuration (LOCAL)
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=verus
VERUS_RPC_TIMEOUT=10000

# ZMQ Configuration (LOCAL)
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:28332
ENABLE_ZMQ=true

# Redis Configuration (LOCAL)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://192.168.86.89:3000

# Enable all performance features
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_COMPRESSION=true
ENABLE_PERFORMANCE_MONITORING=true
```

---

## 🔌 Step 4: Configure Verus Daemon for ZMQ

Still on the production PC:

```bash
# 1. Stop daemon
verus stop
sleep 10

# 2. Backup config
cp ~/.komodo/VRSC/VRSC.conf ~/.komodo/VRSC/VRSC.conf.backup

# 3. Add ZMQ configuration
cat >> ~/.komodo/VRSC/VRSC.conf << 'EOF'

# ZMQ Real-Time Notifications (Local)
zmqpubhashblock=tcp://127.0.0.1:28332
zmqpubhashtx=tcp://127.0.0.1:28332
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28332
EOF

# 4. Start daemon
verusd &

# 5. Wait and verify
sleep 5
netstat -an | grep 28332
# Should show: tcp   0   0 127.0.0.1:28332   0.0.0.0:*   LISTEN
```

---

## 🏗️ Step 5: Build and Start Explorer

```bash
cd ~/verus-explorer

# Build for production
npm run build

# Start the application
npm start

# Or use PM2 for production (recommended)
npm install -g pm2
pm2 start npm --name "verus-explorer" -- start
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

---

## ✅ Step 6: Verify Everything Works

### A. Check if Explorer is Running

```bash
# Check the process
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy"
}
```

### B. Check ZMQ Connection

```bash
curl http://localhost:3000/api/zmq/status
```

Expected response:

```json
{
  "zmq": {
    "available": true,
    "connected": true,
    "status": "connected"
  }
}
```

### C. Check Batch RPC

```bash
curl http://localhost:3000/api/batch-info
```

### D. Check Mempool

```bash
curl http://localhost:3000/api/mempool/viewer
```

---

## 🌐 Step 7: Access from Other Devices

To access the explorer from your laptop or other devices:

### A. Open Firewall Port (on production PC)

```bash
# Using UFW
sudo ufw allow 3000/tcp

# Using firewalld
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload

# Using iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### B. Access from Your Laptop

```bash
# From your laptop
curl http://192.168.86.89:3000/api/health

# Or open in browser
firefox http://192.168.86.89:3000
```

---

## 🔄 PM2 Production Setup (Recommended)

For production, use PM2 for process management:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "verus-explorer" -- start

# Configure environment
pm2 set pm2:autodump true
pm2 save

# Enable auto-start on boot
pm2 startup
# Run the command it shows

# Useful PM2 commands
pm2 list                    # List apps
pm2 logs verus-explorer     # View logs
pm2 restart verus-explorer  # Restart
pm2 stop verus-explorer     # Stop
pm2 delete verus-explorer   # Remove
```

---

## 📊 Step 8: Monitor Performance

### View Logs

```bash
# Application logs
pm2 logs verus-explorer

# Or if not using PM2
tail -f logs/verus-explorer.log
```

### Check Resource Usage

```bash
# CPU and Memory
pm2 monit

# Or using htop
htop
```

### Monitor ZMQ

```bash
# Watch for block notifications
pm2 logs verus-explorer | grep "🔔"

# Check indexer stats
curl http://localhost:3000/api/zmq/status | jq .indexer.stats
```

---

## 🔐 Security Recommendations

### A. Secure RPC Credentials

```bash
# Generate strong password
openssl rand -base64 32

# Update in both verus.conf and .env.local
```

### B. Setup Firewall

```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3000/tcp    # Explorer
sudo ufw allow 18843/tcp   # Verus RPC (if needed from network)
sudo ufw enable
```

### C. Setup Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/verus-explorer
```

Nginx config:

```nginx
server {
    listen 80;
    server_name 192.168.86.89;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/verus-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 Updating the Application

When you make changes on your laptop:

```bash
# 1. On laptop: Build and transfer
npm run build
rsync -avz --exclude='node_modules' ./ build@192.168.86.89:~/verus-explorer/

# 2. On PC: Restart
ssh build@192.168.86.89 'cd ~/verus-explorer && pm2 restart verus-explorer'
```

---

## 🐛 Troubleshooting

### Explorer Won't Start

```bash
# Check logs
pm2 logs verus-explorer

# Check if port is already in use
sudo netstat -tulpn | grep 3000

# Check if Redis is running
redis-cli ping
```

### ZMQ Not Connecting

```bash
# Check if daemon has ZMQ enabled
cat ~/.komodo/VRSC/VRSC.conf | grep zmq

# Check if port is listening
netstat -an | grep 28332

# Restart daemon
verus stop && sleep 10 && verusd &
```

### RPC Connection Issues

```bash
# Test RPC connection
curl --user verus:verus --data-binary '{"jsonrpc":"1.0","id":"test","method":"getinfo","params":[]}' http://127.0.0.1:18843/

# Check daemon is running
verus getinfo
```

---

## 📋 Deployment Checklist

Use this checklist when deploying:

- [ ] Transfer project files to production PC
- [ ] Install Node.js 18+
- [ ] Install Redis
- [ ] Run `npm install --production`
- [ ] Copy and configure `.env.local`
- [ ] Configure ZMQ in VRSC.conf
- [ ] Restart Verus daemon
- [ ] Build application: `npm run build`
- [ ] Start with PM2: `pm2 start npm --name verus-explorer -- start`
- [ ] Configure PM2 auto-start: `pm2 startup` and `pm2 save`
- [ ] Open firewall port 3000
- [ ] Test all endpoints
- [ ] Verify ZMQ connection
- [ ] Setup monitoring

---

## 📚 Quick Reference

**Production PC:** `192.168.86.89`  
**Project Location:** `~/verus-explorer`  
**Port:** `3000`  
**RPC:** `127.0.0.1:18843` (local)  
**ZMQ:** `127.0.0.1:28332` (local)  
**Redis:** `localhost:6379`

**Key Commands:**

```bash
# Access PC
ssh build@192.168.86.89

# Project directory
cd ~/verus-explorer

# View logs
pm2 logs verus-explorer

# Restart
pm2 restart verus-explorer

# Check status
curl http://localhost:3000/api/health
curl http://localhost:3000/api/zmq/status
```

---

## 🎉 Done!

Your Verus Explorer is now running on the same machine as the daemon with:

✅ Local RPC (faster)  
✅ ZMQ real-time updates  
✅ Batch RPC support  
✅ Fallback APIs  
✅ Complete mempool viewer  
✅ Production-ready setup

**Access from anywhere:** `http://192.168.86.89:3000`

---

For questions or issues, refer to:

- `IMPLEMENTATION-SUMMARY.md` - Feature documentation
- `ZMQ-SETUP-GUIDE.md` - ZMQ details
- `TROUBLESHOOTING.md` - Common issues (if exists)
