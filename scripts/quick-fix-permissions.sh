#!/bin/bash

# Quick fix for database permissions
# This script applies the permission fixes to the database

echo "🔒 Fixing Database Permissions..."
echo ""
echo "This script will grant the necessary permissions to your database user."
echo "You may be prompted for your system password (for sudo)."
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Apply permissions using psql as postgres user
echo "Applying permissions..."
sudo -u postgres psql -d verus_utxo_db << 'EOF'
-- Grant permissions to verus user
GRANT USAGE ON SCHEMA public TO verus;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO verus;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO verus;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO verus;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO verus;

-- Grant specific permissions on critical tables
GRANT ALL PRIVILEGES ON TABLE identities TO verus;
GRANT ALL PRIVILEGES ON TABLE staking_rewards TO verus;
GRANT ALL PRIVILEGES ON TABLE verusid_statistics TO verus;

\echo ''
\echo '✅ Permissions granted successfully!'
\echo ''
\echo 'Tables accessible by verus user:'
SELECT DISTINCT table_name 
FROM information_schema.role_table_grants 
WHERE grantee = 'verus' 
ORDER BY table_name;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database permissions fixed!"
    echo ""
    echo "🔄 Now restart your application:"
    echo "   npm run dev"
else
    echo ""
    echo "❌ Failed to apply permissions."
    echo ""
    echo "Manual fix: Run these commands as postgres user:"
    echo "   sudo -u postgres psql verus_utxo_db"
    echo "   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO verus;"
    echo "   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO verus;"
fi

