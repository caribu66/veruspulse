const { execSync } = require('child_process');

const iAddress = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
const rAddress = 'RFd31DGN7uFtbTpVgURBgFVnUv8dsxoaAg';

console.log('Checking for stakes from both addresses:');
console.log(`  I-address: ${iAddress}`);
console.log(`  R-address: ${rAddress}`);
console.log('');

const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);
const startHeight = currentHeight - 500;

console.log(`Scanning recent blocks ${startHeight} to ${currentHeight}...`);

let iStakes = 0;
let rStakes = 0;

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
            for (const addr of vout.scriptPubKey.addresses) {
              if (addr === iAddress) iStakes++;
              if (addr === rAddress) rStakes++;
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip errors
  }
}

console.log('');
console.log(`Found in recent 500 blocks:`);
console.log(`  I-address stakes: ${iStakes}`);
console.log(`  R-address stakes: ${rStakes}`);
console.log('');

if (rStakes > 0) {
  console.log('✅ caribu66@ is still staking using the R-address!');
  console.log('   The scanner only captures I-address stakes.');
  console.log('   R-address stakes are not tracked in the database.');
}
