#!/bin/bash

set -e

echo "🚀 VerusPulse Database Quick Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed!${NC}"
    echo "Install with: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Database credentials
DB_NAME="veruspulse"
DB_USER="explorer"
DB_PASS="verus123"
DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

echo "📦 Creating database and user..."
echo "   (You may be prompted for your sudo password)"
echo ""

# Create database and user
sudo -u postgres psql << EOF
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE ${DB_NAME}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Create user if doesn't exist
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};

-- Connect to the database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully!${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
fi

echo ""
echo "📝 Applying database schemas..."

# Apply UTXO schema
echo "   → Creating UTXO tables (stake_events, utxos, etc.)..."
psql "${DB_URL}" -f lib/database/utxo-schema.sql

# Apply VerusID schema
echo "   → Creating VerusID tables (staking_rewards, identities, etc.)..."
psql "${DB_URL}" -f db/migrations/20251013_create_verusid_tables.sql

echo -e "${GREEN}✅ Database schemas applied!${NC}"
echo ""

echo "📝 Updating .env.local..."
if ! grep -q "DATABASE_URL" .env.local 2>/dev/null; then
    echo "DATABASE_URL=${DB_URL}" >> .env.local
    echo "✅ Added DATABASE_URL to .env.local"
else
    echo "⚠️  DATABASE_URL already exists in .env.local"
fi

if ! grep -q "UTXO_DATABASE_ENABLED" .env.local 2>/dev/null; then
    echo "UTXO_DATABASE_ENABLED=true" >> .env.local
    echo "✅ Added UTXO_DATABASE_ENABLED to .env.local"
else
    echo "⚠️  UTXO_DATABASE_ENABLED already exists in .env.local"
fi

echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "📊 Next steps:"
echo "   1. Restart the app: npm run build && npm start"
echo "   2. Scan blockchain for stakes: npm run scan:stakes"
echo ""
echo "Database connection: ${DB_URL}"

