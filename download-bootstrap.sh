#!/bin/bash

# Verus Bootstrap Download Script
# This script downloads the latest blockchain bootstrap for faster sync

set -e

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

# Configuration
VERUS_DATA_DIR="$HOME/.verus"
BOOTSTRAP_URL="https://bootstrap.verus.io/"
BOOTSTRAP_FILE="VRSC-bootstrap.tar.gz"
TEMP_DIR="/tmp/verus-bootstrap"

print_status "🚀 Starting Verus Bootstrap Download..."

# Check if verusd is running
if pgrep -f verusd > /dev/null; then
    print_warning "Verus daemon is running. Stopping it..."
    pkill -f verusd
    sleep 5
fi

# Create backup of existing data
if [ -d "$VERUS_DATA_DIR/blocks" ] || [ -d "$VERUS_DATA_DIR/chainstate" ]; then
    print_status "Creating backup of existing blockchain data..."
    BACKUP_DIR="$VERUS_DATA_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$VERUS_DATA_DIR/blocks" ]; then
        mv "$VERUS_DATA_DIR/blocks" "$BACKUP_DIR/"
        print_status "Backed up blocks directory"
    fi
    
    if [ -d "$VERUS_DATA_DIR/chainstate" ]; then
        mv "$VERUS_DATA_DIR/chainstate" "$BACKUP_DIR/"
        print_status "Backed up chainstate directory"
    fi
    
    print_success "Backup created at: $BACKUP_DIR"
fi

# Create temporary directory
print_status "Creating temporary directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Download bootstrap file
print_status "Downloading bootstrap file from $BOOTSTRAP_URL..."
print_warning "This may take a while depending on your internet connection..."

# Check if wget or curl is available
if command -v wget > /dev/null; then
    DOWNLOAD_CMD="wget -c --progress=bar:force"
elif command -v curl > /dev/null; then
    DOWNLOAD_CMD="curl -L --progress-bar -C -"
else
    print_error "Neither wget nor curl found. Please install one of them."
    exit 1
fi

# Download the bootstrap
if $DOWNLOAD_CMD -o "$BOOTSTRAP_FILE" "$BOOTSTRAP_URL$BOOTSTRAP_FILE"; then
    print_success "Bootstrap download completed!"
else
    print_error "Failed to download bootstrap file"
    exit 1
fi

# Verify download
if [ ! -f "$BOOTSTRAP_FILE" ]; then
    print_error "Bootstrap file not found after download"
    exit 1
fi

FILE_SIZE=$(du -h "$BOOTSTRAP_FILE" | cut -f1)
print_status "Downloaded bootstrap file: $FILE_SIZE"

# Extract bootstrap
print_status "Extracting bootstrap file..."
if tar -xzf "$BOOTSTRAP_FILE"; then
    print_success "Bootstrap extracted successfully!"
else
    print_error "Failed to extract bootstrap file"
    exit 1
fi

# Move extracted data to Verus data directory
print_status "Installing bootstrap data..."

# Create Verus data directory if it doesn't exist
mkdir -p "$VERUS_DATA_DIR"

# Move blocks and chainstate directories
if [ -d "blocks" ]; then
    print_status "Installing blocks directory..."
    mv blocks "$VERUS_DATA_DIR/"
    print_success "Blocks directory installed"
fi

if [ -d "chainstate" ]; then
    print_status "Installing chainstate directory..."
    mv chainstate "$VERUS_DATA_DIR/"
    print_success "Chainstate directory installed"
fi

# Set proper permissions
print_status "Setting permissions..."
chmod -R 755 "$VERUS_DATA_DIR"

# Clean up
print_status "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# Show final status
print_success "🎉 Bootstrap installation completed!"
print_status "Bootstrap data installed to: $VERUS_DATA_DIR"

# Show disk usage
BOOTSTRAP_SIZE=$(du -sh "$VERUS_DATA_DIR" | cut -f1)
print_status "Total blockchain data size: $BOOTSTRAP_SIZE"

print_status "You can now start the Verus daemon with:"
echo "  ./verusd -daemon -rpcuser=verus -rpcpassword=verus -rpcallowip=127.0.0.1 -rpchost=127.0.0.1 -rpcbind=127.0.0.1 -rpcport=18843 -server=1 -rpcworkqueue=256 -txindex=1 -addressindex=1 -timestampindex=1 -spentindex=1 -identityindex=1 -dbcache=2048 -maxmempool=512 -maxconnections=40 -maxuploadtarget=0 -minrelaytxfee=0.00001"

print_warning "Note: The daemon will still need to verify the downloaded blocks, but this should be much faster than downloading from scratch."





















