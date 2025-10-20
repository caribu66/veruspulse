#!/bin/bash

# Check VerusID Staking Database Status
# Shows current staking data and statistics

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     VerusID Staking Database Status                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

export PGPASSWORD=verus_secure_2024
DB_USER=verus_user
DB_NAME=verus_utxo_db
DB_HOST=localhost

# Check database connection
echo -e "${BLUE}Checking database connection...${NC}"
if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected to $DB_NAME${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAKING DATA OVERVIEW${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get overall statistics
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT 
  '📊 Total Identities:      ' || COUNT(*) FROM identities
UNION ALL
SELECT 
  '⛏️  Total Staking Rewards: ' || COUNT(*) FROM staking_rewards
UNION ALL
SELECT 
  '👥 Active Stakers:        ' || COUNT(DISTINCT identity_address) FROM staking_rewards
UNION ALL
SELECT 
  '📈 Block Range:           ' || MIN(block_height) || ' - ' || MAX(block_height) FROM staking_rewards
UNION ALL
SELECT 
  '💰 Total VRSC Staked:     ' || ROUND(SUM(amount_sats::numeric / 100000000), 2) || ' VRSC' FROM staking_rewards
"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TOP 5 STAKERS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
  LEFT(identity_address, 20) || '...' as identity,
  COUNT(*) as stakes,
  ROUND(SUM(amount_sats::numeric / 100000000), 2) as total_vrsc,
  MAX(block_height) as latest_block
FROM staking_rewards 
GROUP BY identity_address 
ORDER BY total_vrsc DESC 
LIMIT 5
"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RECENT STAKING ACTIVITY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
  LEFT(identity_address, 20) || '...' as identity,
  block_height,
  ROUND(amount_sats::numeric / 100000000, 2) as vrsc,
  block_time::date as date
FROM staking_rewards 
ORDER BY block_height DESC 
LIMIT 10
"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}DATABASE TABLES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
  table_name,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
FROM (
  SELECT 
    table_name,
    query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY row_count DESC
LIMIT 15
"

echo ""
echo -e "${GREEN}✅ Staking database is operational!${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  • Start sync: ./start-verusid-sync.sh"
echo "  • Monitor: ./scripts/check-scan-status.sh"
echo "  • View docs: cat STAKING-DATABASE-STATUS.md"
echo ""




