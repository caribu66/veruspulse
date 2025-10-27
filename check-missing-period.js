const fs = require('fs');

const csv = fs.readFileSync(
  '/home/explorer/Documents/tx_export_1761068678152.csv',
  'utf8'
);
const lines = csv.split('\n');

// Extract stakes from April 2023 onwards
const april2023Onwards = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  const type = parts[0];
  const date = parts[3];

  if (type === 'stake' && date >= '2023-04-17') {
    const amount = parseFloat(parts[1]);
    april2023Onwards.push({ date, amount });
  }
}

console.log(`Stakes from April 17, 2023 onwards: ${april2023Onwards.length}`);
console.log('');

if (april2023Onwards.length > 0) {
  console.log('First 10 stakes after April 2023:');
  april2023Onwards.slice(0, 10).forEach(s => {
    console.log(`  ${s.date}: ${s.amount} VRSC`);
  });

  console.log('');
  console.log(
    `Last stake: ${april2023Onwards[april2023Onwards.length - 1].date}`
  );
}

console.log('');
console.log('Database only has stakes through April 16, 2023');
console.log('Export shows stakes through October 19, 2025');
console.log('');
console.log('MISSING:', april2023Onwards.length, 'stakes in our database!');
