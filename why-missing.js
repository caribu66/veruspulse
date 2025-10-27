const { execSync } = require('child_process');

console.log('Analyzing why caribu66 stakes are missing...\n');

// Check what block ranges were actually scanned
console.log('2023 Scanner: 1,780,000 to 2,020,000');
console.log('2024 Scanner: 2,020,000 to 2,260,000');
console.log('2025 Scanner: 2,260,000 to 2,500,000');
console.log('');

// Check when caribu66 last stake occurred
console.log('caribu66 last stake: Block 2,498,070');
console.log('');

// The problem: caribu66 stakes happen at block 2,498,070
// But we scanned up to block 2,500,000
// So why are they missing?

console.log('Investigating...');
console.log('');
console.log('Current database shows:');
console.log('  - caribu66 last stake: Block 2,498,070 (April 16, 2023)');
console.log('  - 2024 scanner range: 2,020,000 to 2,260,000');
console.log('  - 2025 scanner range: 2,260,000 to 2,500,000');
console.log('');
console.log('The stake at 2,498,070 should be in the 2024 or 2025 scan!');

// Let me check when 2,498,070 actually occurred
try {
  const blockHash = execSync(
    `/home/explorer/verus-cli/verus getblockhash 2498070`,
    { encoding: 'utf8' }
  ).trim();
  const blockData = JSON.parse(
    execSync(`/home/explorer/verus-cli/verus getblock ${blockHash} 2`, {
      encoding: 'utf8',
    })
  );
  console.log('');
  console.log(
    `Block 2,498,070 occurred on: ${new Date(blockData.time * 1000).toISOString()}`
  );
  console.log(
    `This is ${blockData.validationtype === 'stake' ? 'PoS' : 'PoW'} block`
  );
} catch (error) {
  console.log('Could not get block info:', error.message);
}
