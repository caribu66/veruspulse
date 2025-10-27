const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

// The 2024 scanner went to 2,259,994
// The 2025 scanner should have covered 2,260,000 to 2,500,000
// But we saw caribu66 last stake at 2,498,070 which is AFTER the 2024 scan ended

console.log('Checking stakes in the gap...');
console.log('');
console.log('2024 scanner: 2,020,000 to 2,260,000 (ended at 2,259,994)');
console.log('2025 scanner: 2,260,000 to 2,500,000');
console.log('caribu66 last stake: Block 2,498,070 (was in 2025 scanner range)');
console.log('');

// Let's check if block 2,498,070 was actually scanned
console.log('Checking if 2,498,070 was processed...');

try {
  const hash = execSync(`/home/explorer/verus-cli/verus getblockhash 2498070`, {
    encoding: 'utf8',
  }).trim();
  const block = JSON.parse(
    execSync(`/home/explorer/verus-cli/verus getblock ${hash} 2`, {
      encoding: 'utf8',
    })
  );

  console.log(`Block date: ${new Date(block.time * 1000).toISOString()}`);
  console.log(`Block type: ${block.validationtype}`);
  console.log('');

  // Check if caribu66 staked in this block
  if (block.tx && block.tx[0]) {
    const coinstake = block.tx[0];
    let found = false;
    if (coinstake.vout) {
      for (const vout of coinstake.vout) {
        if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
          if (vout.scriptPubKey.addresses.includes(address)) {
            console.log(`✅ Found caribu66 stake in block ${2498070}`);
            found = true;
          }
        }
      }
    }
    if (!found) {
      console.log(`❌ caribu66 did NOT stake in block ${2498070}`);
    }
  }
} catch (error) {
  console.log('Error:', error.message);
}
