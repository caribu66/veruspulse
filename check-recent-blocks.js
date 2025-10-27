const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

// Get current blockchain height
const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);

console.log(`Current blockchain height: ${currentHeight.toLocaleString()}`);
console.log('');

// Check recent blocks (last 1000)
const startHeight = currentHeight - 1000;

console.log(`Scanning recent blocks ${startHeight} to ${currentHeight}...`);

let found = 0;
const stakes = [];

for (let height = startHeight; height <= currentHeight; height++) {
  try {
    const blockHash = execSync(
      `/home/explorer/verus-cli/verus getblockhash ${height}`,
      { encoding: 'utf8' }
    ).trim();
    const blockData = JSON.parse(
      execSync(`/home/explorer/verus-cli/verus getblock ${blockHash} 2`, {
        encoding: 'utf8',
      })
    );

    if (
      blockData.validationtype === 'stake' &&
      blockData.tx &&
      blockData.tx[0]
    ) {
      const coinstake = blockData.tx[0];
      if (coinstake.vout) {
        for (const vout of coinstake.vout) {
          if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
            if (vout.scriptPubKey.addresses.includes(address)) {
              const date = new Date(blockData.time * 1000);
              stakes.push({ height, date });
              found++;
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip errors
  }

  if (height % 100 === 0) {
    process.stdout.write(`\rChecked ${height - startHeight} blocks...`);
  }
}

console.log('\n');
console.log(`Found ${found} stakes from caribu66@ in recent 1000 blocks`);
console.log('');

if (stakes.length > 0) {
  console.log('Recent stakes:');
  stakes.slice(0, 10).forEach(stake => {
    console.log(`   Block ${stake.height}: ${stake.date.toISOString()}`);
  });
}
