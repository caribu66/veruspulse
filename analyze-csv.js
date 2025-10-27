const fs = require('fs');

const csvFile = '/home/explorer/Documents/tx_export_1761068678152.csv';
const csvContent = fs.readFileSync(csvFile, 'utf8');
const csvLines = csvContent.split('\n').filter(line => line.trim());

console.log('📊 CSV ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Count transaction types
const types = {};
csvLines.forEach(line => {
  const parts = line.split(',');
  if (parts.length >= 9) {
    const type = parts[0];
    types[type] = (types[type] || 0) + 1;
  }
});

console.log('Transaction types in CSV:');
Object.entries(types).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log('');

// Analyze stake transactions
const stakeLines = csvLines.filter(line => line.startsWith('stake,'));
console.log(`Stake transactions: ${stakeLines.length}`);
console.log('');

if (stakeLines.length > 0) {
  // Get date range
  const dates = stakeLines
    .map(line => {
      const parts = line.split(',');
      return parts[3]; // Date column
    })
    .sort();

  console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
  console.log('');

  // Show first few stake transactions
  console.log('First 5 stake transactions:');
  stakeLines.slice(0, 5).forEach((line, i) => {
    const parts = line.split(',');
    console.log(`  ${i + 1}. ${parts[7]} - ${parts[1]} VRSC - ${parts[3]}`);
  });
  console.log('');

  // Show last few stake transactions
  console.log('Last 5 stake transactions:');
  stakeLines.slice(-5).forEach((line, i) => {
    const parts = line.split(',');
    console.log(`  ${i + 1}. ${parts[7]} - ${parts[1]} VRSC - ${parts[3]}`);
  });
}
