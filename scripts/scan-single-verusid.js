#!/usr/bin/env node
/**
 * scan-single-verusid.js
 * Scan a single VerusID for staking rewards and populate statistics
 */

const { Pool } = require('pg');

const VERUS_ID = process.argv[2];

if (!VERUS_ID) {
  console.error('Usage: node scan-single-verusid.js <verusid-name>');
  console.error('Example: node scan-single-verusid.js caribu66@');
  process.exit(1);
}

console.log(`\n╔════════════════════════════════════════════════╗`);
console.log(`║  Scanning VerusID: ${VERUS_ID.padEnd(29)} ║`);
console.log(`╚════════════════════════════════════════════════╝\n`);

// Make API call to scan
fetch(
  `http://localhost:3000/api/verusid/${VERUS_ID}/staking-stats?refresh=true`
)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Scan Complete!\n');
      console.log('Statistics:');
      console.log(`  Total Stakes: ${data.data.totalStakes || 0}`);
      console.log(`  Total Rewards: ${data.data.totalRewards || 0} VRSC`);
      console.log(`  APY: ${data.data.apyAllTime || 0}%`);
      console.log(`  Network Rank: ${data.data.networkRank || 'N/A'}`);
      console.log('');
    } else {
      console.error('❌ Error:', data.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('❌ Failed to scan:', err.message);
    process.exit(1);
  });
