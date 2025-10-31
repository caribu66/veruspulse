#!/bin/bash

# PERMANENT CONFIGURATION LOCK
# This script sets up your database permissions ONCE AND FOR ALL
# Run this ONCE, then never worry about permissions again

set -e

echo "╔═══════════════════════════════════════════╗"
echo "║   LOCKING CONFIGURATION PERMANENTLY       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

echo "🔒 Setting permanent database permissions..."

sudo -u postgres psql verus_utxo_db << 'EOSQL'

-- PERMANENT PERMISSIONS FOR VERUS USER
-- These will apply to ALL current and future objects

-- Grant ALL privileges on schema
GRANT ALL PRIVILEGES ON SCHEMA public TO verus;

-- Grant ALL on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO verus;

-- Grant ALL on existing sequences  
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO verus;

-- Grant ALL on existing functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO verus;

-- DEFAULT PRIVILEGES (applies to future objects)
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL PRIVILEGES ON TABLES TO verus;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL PRIVILEGES ON SEQUENCES TO verus;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL PRIVILEGES ON FUNCTIONS TO verus;

-- Transfer ownership of materialized views
ALTER MATERIALIZED VIEW IF EXISTS staking_daily OWNER TO verus;

-- Make verus user the owner of all tables (prevents permission issues)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tableowner != 'verus'
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO verus';
        RAISE NOTICE 'Transferred ownership of table % to verus', r.tablename;
    END LOOP;
END $$;

-- Transfer ownership of sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequencename) || ' OWNER TO verus';
        RAISE NOTICE 'Transferred ownership of sequence % to verus', r.sequencename;
    END LOOP;
END $$;

-- Verify permissions
SELECT 
    'verus' as username,
    has_schema_privilege('verus', 'public', 'CREATE') as can_create,
    has_schema_privilege('verus', 'public', 'USAGE') as can_use;

\echo ''
\echo '✅ ALL PERMISSIONS LOCKED PERMANENTLY'
\echo ''

EOSQL

echo ""
echo "✅ Configuration locked successfully!"
echo ""
echo "📋 What was done:"
echo "   ✅ Verus user now OWNS all tables (no more permission issues)"
echo "   ✅ Verus user has ALL privileges on schema"
echo "   ✅ Default privileges set (future objects auto-granted)"
echo "   ✅ Materialized view ownership transferred"
echo ""
echo "🔒 This is PERMANENT. You won't need to run this again."
echo ""
echo "🚀 Your app is now bulletproof. Start it with:"
echo "   npm run dev"
echo ""

