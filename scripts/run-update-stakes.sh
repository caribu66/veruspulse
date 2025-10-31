#!/bin/bash
# Quick wrapper to run active-iaddress-scanner.js with proper environment

cd /home/explorer/verus-dapp
source .env
export DATABASE_URL

# Run the active I-address scanner (it will exit after catching up)
/usr/bin/node scripts/active-iaddress-scanner.js >> /tmp/stake-updates.log 2>&1




