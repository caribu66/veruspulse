#!/bin/bash
# Script to fix PostgreSQL authentication for verus_user

echo "🔧 PostgreSQL Authentication Fix Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating/updating PostgreSQL user and database${NC}"
echo "You'll need to enter your system password for sudo commands..."
echo ""

# Create database and user as postgres superuser
sudo -u postgres psql <<EOF
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS verus_utxo_db;

-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'verus_user') THEN
    CREATE USER verus_user WITH PASSWORD 'verus_secure_2024';
  END IF;
END
\$\$;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE verus_utxo_db TO verus_user;

-- Connect to the database and grant schema privileges
\c verus_utxo_db
GRANT ALL ON SCHEMA public TO verus_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO verus_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO verus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO verus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO verus_user;

\q
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database/user${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Updating pg_hba.conf for password authentication${NC}"

# Find pg_hba.conf location
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;')
echo "Found pg_hba.conf at: $PG_HBA"

# Backup original
sudo cp "$PG_HBA" "$PG_HBA.backup.$(date +%Y%m%d_%H%M%S)"
echo "Backup created: $PG_HBA.backup"

# Add or update authentication rules for local connections
echo "Updating authentication rules..."

# Check if verus_user rule exists
if ! sudo grep -q "verus_user.*md5" "$PG_HBA"; then
    # Add rule for verus_user with password authentication
    sudo sed -i '/^# TYPE.*DATABASE.*USER.*ADDRESS.*METHOD/a \
# Allow verus_user with password\
local   verus_utxo_db   verus_user                          md5\
host    verus_utxo_db   verus_user      127.0.0.1/32       md5\
host    verus_utxo_db   verus_user      ::1/128            md5' "$PG_HBA"
    echo -e "${GREEN}✅ Added verus_user authentication rules${NC}"
else
    echo -e "${YELLOW}Authentication rules already exist${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Reloading PostgreSQL configuration${NC}"
sudo systemctl reload postgresql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload PostgreSQL${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Testing connection${NC}"
PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection test successful!${NC}"
else
    echo -e "${RED}❌ Connection test failed${NC}"
    echo "Try manually: PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ PostgreSQL authentication fixed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Connection string for .env.local:"
echo "DATABASE_URL=postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db"
echo ""
echo "Now you can run the schema migration:"
echo "PGPASSWORD='verus_secure_2024' psql -U verus_user -d verus_utxo_db -h localhost -f lib/database/utxo-schema.sql"

