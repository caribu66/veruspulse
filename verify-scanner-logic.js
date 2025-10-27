const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

// Check if the scanner is correctly identifying stakes
// Let's check a block that should have a caribu66 stake according to the export

console.log('Checking if our scanner logic would find caribu66 stakes...');
console.log('');

// Get a recent block where caribu66 staked (from the export, Oct 19, 2025)
console.log('Searching for recent stakes from caribu66@...');
console.log('');

// Scan the last 5000 blocks
const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);
let found = 0;

for (let h = currentHeight - 5000; h <= currentHeight; h++) {
  if (h % 500 === 0) process.stdout.write(`\rChecking block ${h}...`);

  try {
    const hash = execSync(`/home/explorer/verus-cli/verus getblockhash ${h}`, {
      encoding: 'utf8',
    }).trim();
    const block = JSON.parse(
      execSync(`/home/explorer/verus-cli/verus getblock ${hash} 2`, {
        encoding: 'utf8',
      })
    );

    if (block.validationtype === 'stake' && block.tx && block.tx[0]) {
      const coinstake = block.tx[0];
      if (coinstake.vout) {
        for (const vout of coinstake.vout) {
          if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
            if (vout.scriptPubKey.addresses.includes(address)) {
              found++;
              const date = new Date(block.time * 1000);
              console.log(`\n✅ Found at block ${h}: ${date.toISOString()}`);
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip
  }
}

console.log(`\n\nTotal found in recent 5000 blocks: ${found}`);
