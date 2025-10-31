# Remote Verus Daemon Setup Guide

This guide helps you set up a Verus daemon on a remote server while keeping your development environment on your local machine.

## 🏗️ Architecture Overview

```
┌─────────────────┐    Network     ┌─────────────────┐
│  Development    │ ────────────── │  Daemon Server  │
│  Machine        │                │                 │
│                 │                │                 │
│  - Code Editor  │                │  - verusd       │
│  - Next.js App  │                │  - Blockchain   │
│  - Browser      │                │  - Full Node    │
└─────────────────┘                └─────────────────┘
```

## 🚀 Quick Setup

### 1. Run the Setup Script

```bash
# Make the setup script executable
chmod +x setup-remote-daemon.sh

# Run the interactive setup
./setup-remote-daemon.sh
```

### 2. Configure the Daemon Server

On your **daemon server** (the PC where you'll run verusd):

```bash
# Copy the generated configuration
scp verus-remote.conf user@daemon-server:~/

# On the daemon server, place it in the correct location
mkdir -p ~/.komodo/VRSC/
cp ~/verus-remote.conf ~/.komodo/VRSC/verus.conf

# Configure firewall (Ubuntu/Debian)
sudo ufw allow 18843/tcp
sudo ufw reload

# Start the daemon
./verusd
```

### 3. Configure the Development Machine

On your **development machine** (this PC):

```bash
# Copy the environment configuration
cp .env.remote .env.local

# Test the connection
node test-remote-connection.js

# Start development server
npm run dev
```

## 🔧 Manual Configuration

### Daemon Server Configuration (`verus.conf`)

```ini
# RPC Configuration for Remote Access
rpcuser=verus
rpcpassword=your_secure_password
rpcallowip=192.168.1.0/24
rpcallowip=10.0.0.0/8
rpchost=0.0.0.0
rpcbind=0.0.0.0
rpcport=18843
server=1

# Essential Indexes
txindex=1
addressindex=1
timestampindex=1
spentindex=1
identityindex=1

# Performance Settings
dbcache=2048
maxmempool=512
maxconnections=40
listen=1
bind=0.0.0.0

daemon=1
```

### Development Machine Configuration (`.env.local`)

```bash
# Remote Verus Daemon
VERUS_RPC_HOST=http://192.168.1.100:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=your_secure_password
VERUS_RPC_TIMEOUT=15000

# Local Redis (optional - can be remote too)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

## 🔒 Security Considerations

### 1. Network Security

```bash
# On the daemon server, restrict RPC access
# In verus.conf, specify only your network range:
rpcallowip=192.168.1.0/24  # Your local network
# Avoid: rpcallowip=0.0.0.0/0  # This allows anyone

# Configure firewall
sudo ufw allow from 192.168.1.0/24 to any port 18843
sudo ufw deny 18843
```

### 2. Authentication Security

```bash
# Use strong RPC credentials
rpcuser=verus_admin_2024
rpcpassword=your_very_secure_password_here

# Consider using RPC SSL certificates for production
# rpcssl=1
# rpcsslcertificatechainfile=server.cert
# rpcsslprivatekeyfile=server.pem
```

### 3. VPN Recommendation

For additional security, consider setting up a VPN:

```bash
# Using WireGuard (recommended)
sudo apt install wireguard

# Create VPN configuration
sudo wg genkey | tee privatekey | wg pubkey > publickey
```

## 📊 Monitoring and Maintenance

### 1. Daemon Server Monitoring

```bash
# Check daemon status
./verus getblockchaininfo

# Monitor sync progress
watch -n 30 './verus getblockchaininfo | grep verificationprogress'

# Check connections
./verus getnetworkinfo | grep connections

# View logs
tail -f ~/.komodo/VRSC/debug.log
```

### 2. Development Machine Testing

```bash
# Test connection
node test-remote-connection.js

# Test specific endpoints
curl http://localhost:3000/api/blockchain-info

# Monitor application logs
npm run dev 2>&1 | tee dev.log
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Refused

**Symptoms:** `ECONNREFUSED` or connection timeout

**Solutions:**

```bash
# Check if daemon is running
ssh user@daemon-server 'ps aux | grep verusd'

# Check firewall
ssh user@daemon-server 'sudo ufw status'

# Test network connectivity
ping daemon-server-ip
telnet daemon-server-ip 18843
```

#### 2. Authentication Failed

**Symptoms:** `401 Unauthorized` or authentication errors

**Solutions:**

```bash
# Verify credentials in verus.conf
ssh user@daemon-server 'cat ~/.komodo/VRSC/verus.conf | grep rpc'

# Check .env.local
cat .env.local | grep VERUS_RPC
```

#### 3. Slow Performance

**Symptoms:** Slow API responses, timeouts

**Solutions:**

```bash
# Increase timeout in .env.local
VERUS_RPC_TIMEOUT=30000

# Optimize daemon settings
# In verus.conf:
dbcache=4096
maxmempool=1024
```

### Network Diagnostics

```bash
# Test basic connectivity
ping daemon-server-ip

# Test port accessibility
nmap -p 18843 daemon-server-ip

# Test RPC endpoint directly
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getblockchaininfo","params":[]}' \
  -u verus:password \
  http://daemon-server-ip:18843
```

## 📈 Performance Optimization

### 1. Daemon Server Optimization

```ini
# In verus.conf
dbcache=4096          # Increase if you have more RAM
maxmempool=1024       # Increase mempool size
maxconnections=60     # Allow more connections
rpcworkqueue=512      # Increase RPC queue size
```

### 2. Development Machine Optimization

```bash
# In .env.local
VERUS_RPC_TIMEOUT=30000    # Increase timeout
CACHE_TTL_BLOCKCHAIN=60    # Increase cache time
CACHE_TTL_BLOCK=600        # Cache blocks longer
```

## 🔄 Backup and Recovery

### 1. Daemon Server Backup

```bash
# Backup blockchain data
tar -czf verus-backup-$(date +%Y%m%d).tar.gz ~/.komodo/VRSC/

# Backup configuration
cp ~/.komodo/VRSC/verus.conf ~/verus.conf.backup
```

### 2. Development Machine Backup

```bash
# Backup configuration
cp .env.local .env.local.backup

# Backup project
git add .
git commit -m "Remote daemon configuration"
```

## 🚀 Production Deployment

For production deployment, consider:

1. **SSL/TLS encryption** for RPC connections
2. **Reverse proxy** (nginx) for additional security
3. **Monitoring tools** (Prometheus, Grafana)
4. **Automated backups**
5. **Load balancing** for multiple daemon instances

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review daemon logs: `~/.komodo/VRSC/debug.log`
3. Test network connectivity
4. Verify firewall settings
5. Check RPC configuration

Remember: The daemon server needs to be fully synced before the explorer will work optimally!
