const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

console.log('Comprehensive search for caribu66@ stakes...\n');

// Check multiple year ranges since 2023
const ranges = [
  { name: 'May-Nov 2023', start: 2540000, end: 2700000 },
  { name: 'Dec 2023', start: 2700000, end: 2800000 },
  { name: '2024', start: 2800000, end: 3000000 },
  { name: '2025', start: 3000000, end: 3200000 },
  { name: 'Recent', start: 3500000, end: 3787449 },
];

for (const range of ranges) {
  console.log(
    `Checking ${range.name} (blocks ${range.start.toLocaleString()} to ${range.end.toLocaleString()})...`
  );

  let found = 0;

  // Sample every 10th block for speed
  for (
    let height = range.start;
    height <= Math.min(range.start + 1000, range.end);
    height += 10
  ) {
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
                console.log(
                  `   ✅ Found at block ${height}: ${date.toISOString()}`
                );
                found++;
              }
            }
          }
        }
      }
    } catch (error) {
      // Skip errors
    }
  }

  if (found === 0) {
    console.log(`   No stakes found in sample`);
  }
  console.log('');
}

console.log('Note: This sampled every 10th block. If no stakes found,');
console.log('caribu66@ may not be staking, or stakes are rare.');
