#!/bin/bash

while true; do
  clear
  echo "===================================================================="
  echo "  VerusPulse Stake Monitoring Dashboard"
  echo "  $(date)"
  echo "===================================================================="
  echo ""
  
  # Blockchain vs Database
  CHAIN_HEIGHT=$(/home/explorer/verus-cli/verus getblockcount 2>/dev/null)
  DB_HEIGHT=$(cd /home/explorer/verus-dapp && PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t -c "SELECT MAX(block_height) FROM staking_rewards;" 2>/dev/null | tr -d ' ')
  BEHIND=$((CHAIN_HEIGHT - DB_HEIGHT))
  
  echo "📊 Sync Status:"
  echo "   Blockchain Height: $CHAIN_HEIGHT"
  echo "   Database Height:   $DB_HEIGHT"
  echo "   Blocks Behind:     $BEHIND"
  
  if [ $BEHIND -lt 5 ]; then
    echo "   Status:            ✅ EXCELLENT"
  elif [ $BEHIND -lt 20 ]; then
    echo "   Status:            ⚠️  GOOD"
  else
    echo "   Status:            🔴 LAGGING"
  fi
  
  echo ""
  
  # Recent stakes
  echo "🆕 Last 5 Stakes Captured:"
  cd /home/explorer/verus-dapp && PGPASSWORD=verus psql -U verus -h 127.0.0.1 -d verus_utxo_db -t << 'EOF'
SELECT 
  '   ' || LPAD(COALESCE(i.base_name, SUBSTRING(sr.identity_address, 1, 15)), 25) || 
  ' | Block ' || sr.block_height ||
  ' | ' || TO_CHAR(sr.block_time, 'HH24:MI:SS') || 
  ' (' || LPAD(ROUND(EXTRACT(EPOCH FROM (NOW() - sr.block_time))/60)::text, 3) || ' min ago)'
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
ORDER BY sr.block_time DESC
LIMIT 5;
EOF
  
  echo ""
  echo "📝 Last Log Entries:"
  tail -4 /tmp/stake-updates.log 2>/dev/null | grep -E "New stakes|Blocks processed|PoS blocks" | tail -3 | sed 's/^/   /'
  
  echo ""
  echo "===================================================================="
  echo "Refreshing every 10 seconds... Press Ctrl+C to exit"
  sleep 10
done

