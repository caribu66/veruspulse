# Deploy to Production PC - Quick Guide

Perfect setup! You're developing on your **laptop** and will deploy to the **PC with the Verus daemon** (192.168.86.89).

---

## 🎯 Your Deployment Plan

```
[Laptop] ──build & deploy──> [Production PC with Verus Daemon]
                              ├── Verus daemon (local)
                              ├── Explorer app (local)
                              ├── Redis (local)
                              └── ZMQ (local) 🚀
```

**Benefits:**
- ⚡ Faster RPC (localhost vs network)
- 🔔 ZMQ real-time updates work perfectly
- 🔒 More secure (no RPC over network)
- 📈 Better performance overall

---

## 🚀 Quick Deploy (2 Steps)

### Step 1: Deploy from Laptop

Run the automated deployment script:

```bash
./deploy-to-production.sh
```

This will:
1. ✅ Build the application
2. ✅ Transfer files to production PC
3. ✅ Install dependencies
4. ✅ Start the application

**That's it for the basic deployment!**

### Step 2: Setup ZMQ on Production PC (Optional but Recommended)

SSH into the production PC and configure ZMQ:

```bash
# SSH into production PC
ssh build@192.168.86.89

# Add ZMQ to verus config
cat >> ~/.komodo/VRSC/VRSC.conf << 'EOF'

# ZMQ Real-Time Notifications
zmqpubhashblock=tcp://127.0.0.1:28332
zmqpubhashtx=tcp://127.0.0.1:28332
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28332
EOF

# Restart daemon
verus stop && sleep 10 && verusd &

# Restart explorer
pm2 restart verus-explorer
```

---

## ✅ Verify It's Working

From your laptop, check the deployed explorer:

```bash
# Check health
curl http://192.168.86.89:3000/api/health

# Check ZMQ (should show "connected" after Step 2)
curl http://192.168.86.89:3000/api/zmq/status

# Check batch RPC
curl http://192.168.86.89:3000/api/batch-info

# Check mempool
curl http://192.168.86.89:3000/api/mempool/viewer
```

Or open in browser: `http://192.168.86.89:3000`

---

## 📋 Prerequisites on Production PC

Before first deployment, ensure the production PC has:

```bash
# SSH into production PC
ssh build@192.168.86.89

# Install Node.js (if not present)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis (required)
sudo apt-get install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Install PM2 (recommended)
npm install -g pm2

# Verify
node --version  # Should be v18+
redis-cli ping  # Should return PONG
pm2 --version   # Should show version
```

---

## 🔄 Updating After Changes

When you make changes on your laptop:

```bash
# Just run the deploy script again
./deploy-to-production.sh
```

It will:
- Rebuild
- Transfer changes
- Restart automatically

---

## 📁 What Gets Deployed

**Included:**
- ✅ Built application (.next folder)
- ✅ Source code
- ✅ Configuration templates
- ✅ Documentation
- ✅ Public assets

**Excluded (for efficiency):**
- ❌ node_modules (installed on prod)
- ❌ .git (version control)
- ❌ cache & logs
- ❌ .env.local (configured on prod)

---

## ⚙️ Production Configuration

On production PC, edit `.env.local`:

```bash
ssh build@192.168.86.89
cd ~/verus-explorer
nano .env.local
```

**Important settings for production:**

```env
# Daemon is LOCAL now (not remote!)
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=verus

# ZMQ is LOCAL now
VERUS_ZMQ_ADDRESS=tcp://127.0.0.1:28332
ENABLE_ZMQ=true

# Redis is LOCAL
REDIS_HOST=localhost
REDIS_PORT=6379

# Production mode
NODE_ENV=production

# URL for accessing from network
NEXT_PUBLIC_APP_URL=http://192.168.86.89:3000
```

---

## 🔍 Monitoring

From your laptop:

```bash
# View logs
ssh build@192.168.86.89 'pm2 logs verus-explorer --lines 50'

# Check status
ssh build@192.168.86.89 'pm2 status'

# Monitor in real-time
ssh build@192.168.86.89 'pm2 monit'
```

---

## 🐛 Troubleshooting

### Deployment fails with SSH error

```bash
# Setup SSH key for easier access
ssh-copy-id build@192.168.86.89
```

### Application won't start on production

```bash
# Check logs
ssh build@192.168.86.89 'cd ~/verus-explorer && pm2 logs'

# Check if Redis is running
ssh build@192.168.86.89 'redis-cli ping'

# Check if daemon is running
ssh build@192.168.86.89 'verus getinfo'
```

### Can't access from laptop

```bash
# Open firewall on production PC
ssh build@192.168.86.89 'sudo ufw allow 3000/tcp'
```

---

## 📚 Full Documentation

- **DEPLOYMENT-GUIDE.md** - Complete deployment guide
- **IMPLEMENTATION-SUMMARY.md** - All features documentation
- **ZMQ-SETUP-GUIDE.md** - Detailed ZMQ setup

---

## 🎯 Quick Commands

```bash
# Deploy
./deploy-to-production.sh

# Check status
curl http://192.168.86.89:3000/api/health

# View logs
ssh build@192.168.86.89 'pm2 logs verus-explorer'

# Restart
ssh build@192.168.86.89 'pm2 restart verus-explorer'

# SSH to production
ssh build@192.168.86.89
```

---

## ✨ Summary

**Your setup:**
1. ✅ Develop on laptop
2. ✅ Run `./deploy-to-production.sh` to deploy
3. ✅ Setup ZMQ on production PC (one-time)
4. ✅ Access from anywhere: `http://192.168.86.89:3000`

**Result:**
- Fastest possible performance (everything local)
- Real-time updates with ZMQ
- All new features working
- Production-ready setup

**Need help?** See `DEPLOYMENT-GUIDE.md` for complete instructions.

---

🎉 **Ready to deploy!**



