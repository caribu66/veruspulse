#!/bin/bash

# Apply Analytics Schema Script
# This script applies the analytics and view tracking schema to the database

set -e

echo "🚀 Applying Analytics Schema..."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Check if UTXO_DATABASE_ENABLED is true
if [ "$UTXO_DATABASE_ENABLED" != "true" ]; then
    echo "❌ Error: UTXO_DATABASE_ENABLED must be set to 'true'"
    exit 1
fi

# Apply the analytics schema
echo "📊 Creating analytics tables and functions..."
psql "$DATABASE_URL" -f lib/database/analytics-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Analytics schema applied successfully!"
    echo ""
    echo "📋 Created tables:"
    echo "  - verusid_views (view tracking)"
    echo "  - verusid_daily_views (daily aggregation)"
    echo "  - verusid_trend_metrics (trend calculations)"
    echo ""
    echo "🔧 Created functions:"
    echo "  - calculate_trend_percent()"
    echo "  - update_daily_views()"
    echo "  - calculate_verusid_trends()"
    echo ""
    echo "⚡ Next steps:"
    echo "  1. Run trend calculation: POST /api/cron/calculate-trends"
    echo "  2. Set up cron job to run every hour"
    echo "  3. Test view tracking: POST /api/analytics/views"
else
    echo "❌ Error applying analytics schema"
    exit 1
fi
