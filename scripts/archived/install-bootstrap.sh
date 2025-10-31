#!/bin/bash

# Install Verus Bootstrap
set -e

echo "🚀 Installing Verus Bootstrap..."

# Kill any running verusd
pkill -f verusd 2>/dev/null || true
sleep 3

# Bootstrap file location
BOOTSTRAP_FILE="/home/build/.komodo/VRSC/VRSC-bootstrap.tar.gz"
VERUS_DATA_DIR="$HOME/.verus"

echo "📁 Bootstrap file: $BOOTSTRAP_FILE"
echo "📁 Target directory: $VERUS_DATA_DIR"

# Check if bootstrap file exists
if [ ! -f "$BOOTSTRAP_FILE" ]; then
    echo "❌ Bootstrap file not found: $BOOTSTRAP_FILE"
    exit 1
fi

# Show file size
FILE_SIZE=$(du -h "$BOOTSTRAP_FILE" | cut -f1)
echo "📦 Bootstrap file size: $FILE_SIZE"

# Create backup of existing data
if [ -d "$VERUS_DATA_DIR/blocks" ] || [ -d "$VERUS_DATA_DIR/chainstate" ]; then
    echo "💾 Creating backup of existing data..."
    BACKUP_DIR="$VERUS_DATA_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$VERUS_DATA_DIR/blocks" ]; then
        mv "$VERUS_DATA_DIR/blocks" "$BACKUP_DIR/"
        echo "✅ Backed up blocks directory"
    fi
    
    if [ -d "$VERUS_DATA_DIR/chainstate" ]; then
        mv "$VERUS_DATA_DIR/chainstate" "$BACKUP_DIR/"
        echo "✅ Backed up chainstate directory"
    fi
fi

# Create Verus data directory
mkdir -p "$VERUS_DATA_DIR"

# Extract bootstrap
echo "📂 Extracting bootstrap (this may take several minutes)..."
cd "$VERUS_DATA_DIR"

# Extract with progress
tar -xzf "$BOOTSTRAP_FILE" --checkpoint=1000 --checkpoint-action=echo="Extracted %{TAR_CHECKPOINT} files..."

echo "✅ Bootstrap extraction completed!"

# Set permissions
chmod -R 755 "$VERUS_DATA_DIR"

# Show results
echo ""
echo "🎉 Bootstrap installation completed!"
echo "📊 Data installed to: $VERUS_DATA_DIR"

if [ -d "blocks" ] && [ -d "chainstate" ]; then
    BLOCK_COUNT=$(find blocks -name "*.dat" | wc -l)
    CHAIN_SIZE=$(du -sh . | cut -f1)
    echo "📈 Blockchain data: $CHAIN_SIZE"
    echo "📦 Block files: $BLOCK_COUNT"
    echo ""
    echo "🚀 Starting optimized Verus daemon..."
    
    # Start daemon with optimized settings
    cd /home/build/verus-dapp/verus-cli
    ./verusd \
      -daemon \
      -rpcuser=verus \
      -rpcpassword=verus \
      -rpcallowip=127.0.0.1 \
      -rpchost=127.0.0.1 \
      -rpcbind=127.0.0.1 \
      -rpcport=18843 \
      -server=1 \
      -rpcworkqueue=256 \
      -txindex=1 \
      -addressindex=1 \
      -timestampindex=1 \
      -spentindex=1 \
      -identityindex=1 \
      -dbcache=4096 \
      -maxmempool=1024 \
      -maxconnections=50 \
      -maxuploadtarget=0 \
      -minrelaytxfee=0.00001 \
      -par=4
    
    echo "✅ Daemon started with optimized settings!"
    echo ""
    echo "🔍 Monitor sync progress:"
    echo "  curl -s -u verus:verus -X POST -H 'Content-Type: application/json' \\"
    echo "    -d '{\"method\":\"getblockchaininfo\",\"params\":[],\"id\":1}' \\"
    echo "    http://127.0.0.1:18843 | grep -o '\"verificationprogress\":[0-9.]*'"
    echo ""
    echo "⏱️ With bootstrap, sync should complete in 30-60 minutes instead of hours!"
else
    echo "❌ Bootstrap installation failed - directories not found"
    exit 1
fi





















