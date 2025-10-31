#!/bin/bash

echo "🔧 Setting up PostgreSQL database for VerusPulse..."

# Create database and user
sudo -u postgres psql << EOF
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE veruspulse' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'veruspulse')\gexec

-- Create user if doesn't exist
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'explorer') THEN
    CREATE USER explorer WITH PASSWORD 'verus123';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE veruspulse TO explorer;
ALTER DATABASE veruspulse OWNER TO explorer;
EOF

echo "✅ Database and user created!"
echo ""
echo "📝 Database credentials:"
echo "  Database: veruspulse"
echo "  User: explorer"
echo "  Password: verus123"
echo "  Connection: postgresql://explorer:verus123@localhost:5432/veruspulse"
echo ""
echo "Now run: npm run db:setup"

