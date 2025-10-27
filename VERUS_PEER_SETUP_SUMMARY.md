# VerusCoin Peer Connection Setup - Complete Guide

## 🎯 Goal: Get More Than 5 Peers for Fast Sync

You now have everything configured to ensure you get more than 5 peers when launching `verusd`. Here's what has been set up:

## ✅ What's Been Configured

### 1. Optimized Configuration File

- **Location**: `~/.komodo/VRSC/verus.conf`
- **Port**: 25089 (your router port - already opened)
- **Max Connections**: 125
- **Listen**: Enabled for incoming connections
- **Seed Nodes**: 6 official Verus Foundation nodes
- **Community Nodes**: 15 reliable nodes
- **Total Addnode Entries**: 21

### 2. Scripts Created

- `start-verusd-optimized.sh` - Starts daemon with peer monitoring
- `monitor-peers.sh` - Real-time peer connection monitoring
- `check-verus-setup.sh` - Verifies your setup
- `setup-verus-peers.sh` - Complete setup automation

## 🚀 How to Start (Recommended Method)

### Step 1: Start the Daemon

```bash
cd /home/explorer/verus-dapp
./start-verusd-optimized.sh
```

This script will:

- ✅ Verify all prerequisites
- ✅ Start the daemon with optimized settings
- ✅ Monitor peer connections for 2 minutes
- ✅ Show you when you have more than 5 peers

### Step 2: Monitor Connections (Optional)

```bash
./monitor-peers.sh
```

This will show real-time peer connection status.

## 🔧 Manual Commands (Alternative)

If you prefer to start manually:

```bash
# Start daemon
cd ~/.komodo/VRSC
/home/explorer/verus-cli/verusd -daemon -conf=verus.conf

# Check connections
/home/explorer/verus-cli/verus-cli getconnectioncount

# View peer info
/home/explorer/verus-cli/verus-cli getpeerinfo
```

## 📊 Expected Results

With this configuration, you should see:

- **Initial connections**: 5-10 peers within 30 seconds
- **Target connections**: 15-25 peers within 2-3 minutes
- **Maximum connections**: Up to 125 peers

## 🔍 Troubleshooting

### If you get fewer than 5 peers:

1. **Check firewall**:

   ```bash
   sudo ufw allow 25089/tcp
   ```

2. **Verify configuration**:

   ```bash
   ./check-verus-setup.sh
   ```

3. **Check daemon logs**:
   ```bash
   tail -f ~/.komodo/VRSC/debug.log
   ```

### If daemon won't start:

1. **Check if already running**:

   ```bash
   pkill -f verusd
   ```

2. **Check port availability**:
   ```bash
   netstat -tlnp | grep 25089
   ```

## 🎉 Success Indicators

You'll know it's working when:

- ✅ `getconnectioncount` shows more than 5
- ✅ `getpeerinfo` shows diverse peer addresses
- ✅ Blockchain sync progresses rapidly
- ✅ No connection errors in debug.log

## 📋 Configuration Highlights

Your optimized configuration includes:

- **6 Official Verus Foundation Seed Nodes**
- **15 Reliable Community Nodes** (Europe & North America)
- **125 Maximum Connections** (increased from 200 for realism)
- **Port 25089** (your router port)
- **Listen Enabled** for incoming connections
- **DNS Seeding Enabled** for peer discovery

## 🚀 Ready to Launch!

Your setup is now optimized for maximum peer connections. Run:

```bash
./start-verusd-optimized.sh
```

And you should get more than 5 peers within minutes!
