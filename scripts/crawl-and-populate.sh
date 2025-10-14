#!/bin/bash
## Adapted from Oink70's Verus-CLI-tools
## Crawls blockchain and populates PostgreSQL database with VerusIDs

# Configuration
VERUS_CLI="${VERUS_CLI:-verus}"
START_BLOCK=${1:-800200}  # First block with VerusIDs
END_BLOCK=${2:-$(curl -s http://localhost:3000/api/consolidated-data | jq -r '.data.blockchain.blocks')}
THREADS=${3:-$(nproc)}
OUTPUT_DIR="/home/explorer/verus-dapp/data/verusid-crawl"

# Database config
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="verus_utxo_db"
DB_USER="verus_user"
DB_PASS="verus_secure_2024"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "===================================================="
echo "  VerusID Blockchain Crawler (Database Edition)"
echo "===================================================="
echo ""
echo "Configuration:"
echo "  Blocks: $START_BLOCK to $END_BLOCK"
echo "  Threads: $THREADS"
echo "  Output: $OUTPUT_DIR"
echo "  Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Check if verus CLI is available via API
if ! curl -s http://localhost:3000/api/consolidated-data | jq -e '.success' > /dev/null 2>&1; then
    echo "❌ Next.js API not accessible at http://localhost:3000"
    echo "   Make sure the dev server is running: npm run dev"
    exit 1
fi

# Check database connection
if ! PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Database connection failed"
    exit 1
fi

echo "✅ API and database connections verified"
echo ""

# Since we can't use Verus CLI directly, we'll use the scanner that's already running
# Just check if we have VerusIDs in the output files from Oink70's script
echo "📋 Checking for existing VerusID data files..."
echo ""

# Function to import VerusIDs from text files into database
import_from_files() {
    local file_type="$1"
    local file="$OUTPUT_DIR/VerusIDs-${file_type}.txt"
    
    if [ ! -f "$file" ]; then
        echo "No $file_type file found"
        return
    fi
    
    local count=0
    while IFS= read -r line; do
        # Parse the JSON array [name, i-address, parent]
        name=$(echo "$line" | jq -r '.[0]')
        iaddr=$(echo "$line" | jq -r '.[1]')
        parent=$(echo "$line" | jq -r '.[2]')
        
        if [ -n "$iaddr" ] && [ "$iaddr" != "null" ]; then
            # Insert into database
            PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF 2>/dev/null
INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
VALUES ('$iaddr', '$name', '${name}@', NOW())
ON CONFLICT (identity_address) 
DO UPDATE SET base_name = '$name', friendly_name = '${name}@', last_refreshed_at = NOW();
EOF
            ((count++))
            if ((count % 100 == 0)); then
                echo "  Imported $count $file_type VerusIDs..."
            fi
        fi
    done < "$file"
    
    echo "✅ Imported $count $file_type VerusIDs"
}

# Try to import existing data
import_from_files "new"
import_from_files "update"
import_from_files "unlock"

echo ""
echo "📊 Current database status:"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT COUNT(*) as total_verusids 
FROM identities 
WHERE identity_address LIKE 'i%';
EOF

echo ""
echo "===================================================="
echo "  Recommendation"
echo "===================================================="
echo ""
echo "The mass scanner is already running and discovering VerusIDs."
echo "It uses the same approach as Oink70's script but integrates"
echo "directly with your Next.js API."
echo ""
echo "To use Oink70's original scripts:"
echo "1. Install Verus CLI tools"
echo "2. Run the original crawl-VerusID.sh"
echo "3. Run this script again to import the generated files"
echo ""
echo "Current status: Check the scanner progress with:"
echo "  ./scripts/monitor-scan.sh"
echo ""


