# VerusID Crawler Documentation

## Overview

Two scripts are available to crawl the Verus blockchain and populate the database with VerusID addresses:

1. **`crawl-VerusID.sh`** - Bash script with multi-threading
2. **`populate-verusids.js`** - Node.js script (recommended)

## Quick Start

### Recommended: Node.js Script

```bash
# Test with recent 1,000 blocks
cd /home/explorer/verus-dapp
node scripts/populate-verusids.js --start 3769000 --end 3770000

# Populate last 50,000 blocks (recommended for 10k+ VerusIDs)
CURRENT=$(curl -s http://localhost:3000/api/consolidated-data | jq -r '.data.blockchain.blocks')
node scripts/populate-verusids.js --start $((CURRENT - 50000)) --end $CURRENT

# Full blockchain crawl (will take many hours)
node scripts/populate-verusids.js
```

### Alternative: Bash Script

```bash
# Test with recent 1,000 blocks
./scripts/crawl-VerusID.sh --start 3769000 --end 3770000

# Use 8 parallel workers
./scripts/crawl-VerusID.sh --start 3760000 --end 3770000 --jobs 8

# Full blockchain
./scripts/crawl-VerusID.sh
```

## Performance Estimates

| Block Range | Expected VerusIDs | Time (Node.js) | Time (Bash) |
|-------------|-------------------|----------------|-------------|
| 1,000 blocks | ~10-50 | 2-5 min | 3-10 min |
| 10,000 blocks | ~100-500 | 20-40 min | 30-60 min |
| 50,000 blocks | ~500-2,500 | 2-3 hours | 3-5 hours |
| 100,000 blocks | ~1,000-5,000 | 4-6 hours | 6-10 hours |
| Full history | ~10,000+ | 20-40 hours | 30-60 hours |

## After Populating the Database

Once you have VerusIDs in the database, restart the mass scanner:

```bash
# Check how many VerusIDs are now in database
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c \
  "SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%';"

# Start the mass scanner (it will now use the populated database)
cd /home/explorer/verus-dapp
echo "1" | ./scripts/start-mass-scan.sh

# Monitor progress
./scripts/monitor-scan.sh
```

## Configuration

Both scripts read from environment variables:

```bash
# RPC Configuration
export VERUS_RPC_USER="verus"
export VERUS_RPC_PASSWORD="verus"
export VERUS_RPC_HOST="127.0.0.1"  # or 192.168.86.89
export VERUS_RPC_PORT="27486"

# Database Configuration
export DATABASE_URL="postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db"
```

## Troubleshooting

### RPC Connection Errors

If you see "RPC call failed" or connection errors:

```bash
# Test RPC connection
curl -s --user verus:verus \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  -H 'content-type: text/plain;' \
  http://127.0.0.1:27486/ | jq
```

If this fails, check:
1. Verus daemon is running
2. RPC credentials are correct in `.env.local`
3. RPC host/port are accessible

### Database Connection Errors

```bash
# Test database connection
PGPASSWORD=verus_secure_2024 psql -U verus_user -h localhost -p 5432 -d verus_utxo_db -c "SELECT 1;"
```

### Slow Performance

- Reduce parallel jobs: `--jobs 2`
- Increase delay: Edit `DELAY_BETWEEN_BATCHES` in scripts
- Use smaller block ranges and run multiple times

## Integration with Mass Scanner

The mass scanner (`intelligent-mass-scanner.ts`) now uses a 4-step discovery process:

1. **Check `stake_events` table** - Finds addresses that have already staked
2. **Check `identities` table** - Finds addresses populated by these crawler scripts ✅
3. **Try `listIdentities()` RPC** - Finds wallet identities (usually empty)
4. **Scan recent blocks** - Fallback method (slow)

By populating the `identities` table with these scripts, the scanner skips the slow block scanning phase!

## Recommended Workflow

```bash
# 1. Populate database with recent blocks (fast, finds active stakers)
cd /home/explorer/verus-dapp
CURRENT=$(curl -s http://localhost:3000/api/consolidated-data | jq -r '.data.blockchain.blocks')
node scripts/populate-verusids.js --start $((CURRENT - 50000)) --end $CURRENT

# 2. Check results
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c \
  "SELECT COUNT(*) as total, 
          COUNT(DISTINCT identity_address) as unique_ids 
   FROM identities 
   WHERE identity_address LIKE 'i%';"

# 3. Start mass scanner
echo "1" | ./scripts/start-mass-scan.sh

# 4. Monitor
./scripts/monitor-scan.sh
```

## Output Files

- **Node.js script**: Outputs to stdout
- **Bash script**: 
  - `verusid-crawl-YYYYMMDD-HHMMSS.log` - Progress log
  - `found-verusids.txt` - List of discovered I-addresses

## Notes

- The scripts automatically deduplicate addresses
- Database inserts use `ON CONFLICT DO UPDATE` to avoid duplicates
- Both scripts support resuming - just run with a new start height
- Monitor system resources (CPU, memory) during crawling
- The RPC may rate-limit requests - the scripts include delays to prevent this

## Support

For issues or questions:
1. Check the logs: `tail -f verusid-crawl-*.log`
2. Verify RPC and database connectivity
3. Try smaller block ranges first
4. Check system resources (disk space, memory)

