const fs = require('fs');

// Read the CSV file
const csv = fs.readFileSync('caribu66_db_stakes.csv', 'utf8');
const lines = csv
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('Block'));
const csvCount = lines.length;

console.log('📊 CSV File: caribu66_db_stakes.csv');
console.log(`   Total stakes: ${csvCount}`);
console.log('');

// Get last stake in CSV
const lastLine = lines[lines.length - 1];
const parts = lastLine.split(',');
const lastBlock = parts[0];
const lastDate = parts[4];

console.log(`Last stake in CSV:`);
console.log(`   Block: ${lastBlock}`);
console.log(`   Date: ${lastDate}`);
console.log('');

console.log('Database has 476 stakes through April 16, 2023');
console.log(`CSV has ${csvCount} stakes`);
console.log('');
console.log('Difference:', 476 - csvCount, 'stakes missing from CSV');
console.log('');

if (csvCount < 476) {
  console.log('⚠️  CSV is INCOMPLETE - missing recent stakes!');
} else {
  console.log('✅ CSV appears complete');
}
