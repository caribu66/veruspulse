#!/bin/bash

# ============================================
# Remote ZMQ Setup Script
# ============================================
# This script helps configure ZMQ on your remote Verus daemon
# ============================================

REMOTE_IP="192.168.86.89"
REMOTE_USER="build"  # Change this to your remote username
VRSC_CONF="~/.komodo/VRSC/VRSC.conf"

echo "================================================"
echo "🔧 Remote ZMQ Setup for Verus Explorer"
echo "================================================"
echo ""
echo "Remote daemon: $REMOTE_IP"
echo "Config file: $VRSC_CONF"
echo ""

# Check if we can reach the remote machine
echo "1️⃣  Checking connectivity to remote daemon..."
if ping -c 1 -W 2 $REMOTE_IP > /dev/null 2>&1; then
    echo "✅ Remote machine is reachable"
else
    echo "❌ Cannot reach remote machine at $REMOTE_IP"
    echo "   Please check network connection"
    exit 1
fi

echo ""
echo "2️⃣  You need to SSH into the remote machine and add ZMQ configuration"
echo ""
echo "Run these commands on the REMOTE machine ($REMOTE_IP):"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "# 1. Stop the Verus daemon"
echo "verus stop"
echo ""
echo "# 2. Wait for shutdown"
echo "sleep 10"
echo ""
echo "# 3. Backup current config"
echo "cp ~/.komodo/VRSC/VRSC.conf ~/.komodo/VRSC/VRSC.conf.backup"
echo ""
echo "# 4. Add ZMQ configuration"
echo "cat >> ~/.komodo/VRSC/VRSC.conf << 'EOF'"
echo ""
echo "# ZMQ Real-Time Notifications"
echo "zmqpubhashblock=tcp://0.0.0.0:28332"
echo "zmqpubhashtx=tcp://0.0.0.0:28332"
echo "zmqpubrawblock=tcp://0.0.0.0:28332"
echo "zmqpubrawtx=tcp://0.0.0.0:28332"
echo "EOF"
echo ""
echo "# 5. Start the daemon"
echo "verusd &"
echo ""
echo "# 6. Check if ZMQ port is open"
echo "sleep 5"
echo "netstat -an | grep 28332"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Offer to attempt SSH configuration
echo ""
read -p "Do you want to try SSH connection to configure it automatically? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Attempting SSH connection..."
    echo "You may be prompted for the remote machine's password"
    echo ""
    
    ssh "${REMOTE_USER}@${REMOTE_IP}" 'bash -s' << 'ENDSSH'
        echo "🔧 Configuring ZMQ on remote daemon..."
        
        # Stop daemon
        echo "Stopping Verus daemon..."
        verus stop 2>/dev/null || echo "Daemon not running or verus command not found"
        sleep 10
        
        # Backup config
        if [ -f ~/.komodo/VRSC/VRSC.conf ]; then
            echo "Backing up VRSC.conf..."
            cp ~/.komodo/VRSC/VRSC.conf ~/.komodo/VRSC/VRSC.conf.backup.$(date +%Y%m%d_%H%M%S)
            
            # Check if ZMQ already configured
            if grep -q "zmqpub" ~/.komodo/VRSC/VRSC.conf; then
                echo "⚠️  ZMQ configuration already exists in VRSC.conf"
                echo "Skipping ZMQ configuration..."
            else
                echo "Adding ZMQ configuration..."
                cat >> ~/.komodo/VRSC/VRSC.conf << 'EOF'

# ZMQ Real-Time Notifications
zmqpubhashblock=tcp://0.0.0.0:28332
zmqpubhashtx=tcp://0.0.0.0:28332
zmqpubrawblock=tcp://0.0.0.0:28332
zmqpubrawtx=tcp://0.0.0.0:28332
EOF
                echo "✅ ZMQ configuration added"
            fi
            
            # Start daemon
            echo "Starting Verus daemon..."
            verusd > /dev/null 2>&1 &
            sleep 5
            
            # Check ZMQ port
            echo "Checking ZMQ port..."
            if netstat -an 2>/dev/null | grep -q 28332; then
                echo "✅ ZMQ is listening on port 28332"
            else
                echo "⚠️  ZMQ port check inconclusive"
                echo "   Wait a moment and check manually with: netstat -an | grep 28332"
            fi
        else
            echo "❌ VRSC.conf not found at ~/.komodo/VRSC/VRSC.conf"
            echo "   Please check your Verus installation"
            exit 1
        fi
ENDSSH
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Remote configuration completed!"
    else
        echo ""
        echo "❌ SSH configuration failed"
        echo "   Please configure manually using the commands shown above"
    fi
fi

echo ""
echo "================================================"
echo "3️⃣  After configuring the remote daemon:"
echo "================================================"
echo ""
echo "On THIS machine, restart your explorer:"
echo ""
echo "  npm run dev"
echo ""
echo "Then check ZMQ status:"
echo ""
echo "  curl http://localhost:3000/api/zmq/status"
echo ""
echo "You should see:"
echo '  "connected": true'
echo '  "status": "connected"'
echo ""
echo "================================================"
echo "📚 For troubleshooting, see: ZMQ-SETUP-GUIDE.md"
echo "================================================"



