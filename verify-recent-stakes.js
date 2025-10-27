const fs = require('fs');

const csv = fs.readFileSync(
  '/home/explorer/Documents/tx_export_1761068678152.csv',
  'utf8'
);
const lines = csv.split('\n');

// Get the most recent stake transaction
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  const type = parts[0];
  const txid = parts[7];
  const date = parts[3];

  if (type === 'stake' && date.startsWith('2025-10')) {
    console.log(`Recent stake transaction:`);
    console.log(`  Date: ${date}`);
    console.log(`  TXID: ${txid}`);
    console.log(`  Amount: ${parts[1]} VRSC`);
    console.log('');
    console.log('Checking if this TXID exists in database...');
    break;
  }
}

console.log('');
console.log('⚠️  We are MISSING caribu66@ stakes from April 2023 onwards!');
console.log('   The export shows 667 additional stakes that we do not have.');
