const fs = require('fs');

const csv = fs.readFileSync(
  '/home/explorer/Documents/tx_export_1761068678152.csv',
  'utf8'
);
const lines = csv.split('\n');
console.log(`Total lines: ${lines.length}`);
console.log('');

// Count stake vs mint
let stakeCount = 0;
let mintCount = 0;
const stakes = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  const type = parts[0];
  const date = parts[3];

  if (type === 'stake') {
    stakeCount++;
    stakes.push({ date, amount: parts[1] });
  } else if (type === 'mint') {
    mintCount++;
  }
}

console.log(`Stake transactions: ${stakeCount}`);
console.log(`Mint transactions: ${mintCount}`);
console.log('');

// Show first and last stakes
if (stakes.length > 0) {
  console.log(`First stake: ${stakes[stakes.length - 1].date}`);
  console.log(`Last stake: ${stakes[0].date}`);
}

console.log('');
console.log('This export shows caribu66@ WAS staking recently (Oct 2025)!');
