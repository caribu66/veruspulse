# Setup Stakes Database - Get Recent Stakes Working!

## Quick Setup (Run These Commands)

### Step 1: Create PostgreSQL Database & User

Run this in your terminal (you'll need sudo password):

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE veruspulse;
CREATE USER explorer WITH PASSWORD 'verus123';
GRANT ALL PRIVILEGES ON DATABASE veruspulse TO explorer;
ALTER DATABASE veruspulse OWNER TO explorer;
\q
EOF
```

### Step 2: Configure Environment Variables

Add to `.env.local`:

```bash
echo "DATABASE_URL=postgresql://explorer:verus123@localhost:5432/veruspulse" >> .env.local
echo "UTXO_DATABASE_ENABLED=true" >> .env.local
```

### Step 3: Initialize Database Schema

```bash
# Apply UTXO schema (creates stake_events table)
psql postgresql://explorer:verus123@localhost:5432/veruspulse -f lib/database/utxo-schema.sql

# Apply VerusID migrations (creates staking_rewards table)
psql postgresql://explorer:verus123@localhost:5432/veruspulse -f db/migrations/20251013_create_verusid_tables.sql
```

### Step 4: Populate Stakes from Blockchain

```bash
# Start the stake scanner to index blockchain data
npm run scan:stakes
```

This will scan the blockchain and populate the database with all historical stakes!

---

## What This Fixes:

✅ **Recent Stakes** will show individual stake events with:
- Exact block height
- Exact timestamp
- Transaction ID (txid)
- Reward amount
- Stake amount
- Stake age

Instead of just showing aggregated daily totals!

---

## Manual Database Check:

After setup, verify tables exist:

```bash
psql postgresql://explorer:verus123@localhost:5432/veruspulse -c "\dt"
```

You should see:
- `stake_events`
- `staking_rewards`
- `identities`
- `utxos`
- And more...

