#!/bin/bash

# Quick Verus Bootstrap Download (using home directory)
set -e

echo "🚀 Quick Verus Bootstrap Download..."

# Stop verusd if running
pkill -f verusd 2>/dev/null || true
sleep 2

# Use home directory instead of /tmp
BOOTSTRAP_DIR="$HOME/verus-bootstrap"
VERUS_DATA_DIR="$HOME/.verus"

echo "📁 Creating bootstrap directory..."
rm -rf "$BOOTSTRAP_DIR"
mkdir -p "$BOOTSTRAP_DIR"
cd "$BOOTSTRAP_DIR"

# Try multiple bootstrap sources
echo "📥 Downloading bootstrap (this may take a while)..."

# Method 1: Try direct download from known sources
BOOTSTRAP_URLS=(
    "https://github.com/WeAreNati/Verus-Bootstrap/releases/latest/download/VRSC-bootstrap.tar.gz"
    "https://bootstrap.verus.io/VRSC-bootstrap.tar.gz"
    "https://files.verus.io/bootstrap/VRSC-bootstrap.tar.gz"
)

DOWNLOAD_SUCCESS=false

for url in "${BOOTSTRAP_URLS[@]}"; do
    echo "🔄 Trying: $url"
    if curl -L --connect-timeout 30 --max-time 3600 -o VRSC-bootstrap.tar.gz "$url" 2>/dev/null; then
        echo "✅ Download successful!"
        DOWNLOAD_SUCCESS=true
        break
    else
        echo "❌ Failed, trying next source..."
    fi
done

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo "❌ All download sources failed. You can manually download a bootstrap file."
    echo "📋 Manual steps:"
    echo "1. Download VRSC-bootstrap.tar.gz from: https://github.com/WeAreNati/Verus-Bootstrap"
    echo "2. Extract it to ~/.verus/"
    echo "3. Start verusd"
    exit 1
fi

# Check file size
FILE_SIZE=$(du -h VRSC-bootstrap.tar.gz | cut -f1)
echo "📦 Downloaded: $FILE_SIZE"

# Extract bootstrap
echo "📂 Extracting bootstrap..."
tar -xzf VRSC-bootstrap.tar.gz

# Install to Verus data directory
echo "📋 Installing to $VERUS_DATA_DIR..."
mkdir -p "$VERUS_DATA_DIR"

if [ -d "blocks" ]; then
    echo "📦 Installing blocks..."
    mv blocks "$VERUS_DATA_DIR/"
fi

if [ -d "chainstate" ]; then
    echo "📦 Installing chainstate..."
    mv chainstate "$VERUS_DATA_DIR/"
fi

# Clean up
echo "🧹 Cleaning up..."
cd "$HOME"
rm -rf "$BOOTSTRAP_DIR"

# Show results
echo "✅ Bootstrap installation complete!"
echo "📊 Data installed to: $VERUS_DATA_DIR"

if [ -d "$VERUS_DATA_DIR/blocks" ] && [ -d "$VERUS_DATA_DIR/chainstate" ]; then
    BLOCK_SIZE=$(du -sh "$VERUS_DATA_DIR" | cut -f1)
    echo "📈 Total blockchain data: $BLOCK_SIZE"
    echo ""
    echo "🚀 You can now start the daemon with:"
    echo "cd /home/build/verus-dapp/verus-cli && ./verusd -daemon"
else
    echo "⚠️ Bootstrap installation may have failed. Check the directories."
fi





















