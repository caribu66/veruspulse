# VerusID Cache - Dead Simple

## What This Is

Caches VerusID data in PostgreSQL. No extra services, just your Next.js app.

- **First time looking up a VerusID**: ~30-60 seconds (fetches from blockchain)
- **Every time after**: <100ms (reads from cache)

## Setup

### 1. Create Database (One Time)

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE verus;
CREATE USER verus WITH PASSWORD 'verus';
GRANT ALL PRIVILEGES ON DATABASE verus TO verus;
GRANT ALL ON SCHEMA public TO verus;
\q
EOF
```

### 2. Create Tables (One Time)

```bash
npm run run:migrate
```

### 3. Check .env

Make sure these are set:
```
DATABASE_URL=postgres://verus:verus@localhost:5432/verus
VERUS_RPC_HOST=http://127.0.0.1:18843
VERUS_RPC_USER=verus
VERUS_RPC_PASSWORD=verus
```

### 4. Restart Next.js

```bash
# Stop your dev server (Ctrl+C)
# Then start it again
npm run dev
```

## That's It!

Now when users search for a VerusID:
1. First time: Caches the data (takes 30-60s)
2. After that: Instant (<100ms)

No services to manage, no PM2, no systemd. Just works.

## Files That Matter

Only **3 files**:
- `lib/verusid-cache.ts` - Database helper
- `app/api/verusid/lookup/route.ts` - Lookup API
- `app/api/verusid/[iaddr]/stats/route.ts` - Stats API

Everything else is your normal Next.js app.

## Test It

```bash
curl -X POST http://localhost:3000/api/verusid/lookup \
  -H 'Content-Type: application/json' \
  -d '{"input":"allbits@"}'
```

Done! 🎉

