const { execSync } = require('child_process');

const iAddress = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
const rAddress = 'RFd31DGN7uFtbTpVgURBgFVnUv8dsxoaAg';

console.log('Checking for stakes using the R-address...\n');
console.log(`I-address: ${iAddress}`);
console.log(`R-address: ${rAddress}`);
console.log('');

// Check for recent stakes with the R-address
const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);
console.log(`Current height: ${currentHeight}\n`);

console.log(
  `Checking recent blocks ${currentHeight - 100} to ${currentHeight}...`
);

let foundR = [];
let foundI = [];

for (let height = currentHeight - 100; height <= currentHeight; height++) {
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
              if (addr === rAddress) {
                foundR.push({ height, date: new Date(blockData.time * 1000) });
              }
              if (addr === iAddress) {
                foundI.push({ height, date: new Date(blockData.time * 1000) });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip
  }
}

console.log('');
console.log(`Found ${foundR.length} R-address stakes in recent 100 blocks`);
console.log(`Found ${foundI.length} I-address stakes in recent 100 blocks`);

if (foundR.length > 0) {
  console.log('\nR-address stakes:');
  foundR.forEach(s => {
    console.log(`  Block ${s.height}: ${s.date.toISOString()}`);
  });
}

if (foundI.length > 0) {
  console.log('\nI-address stakes:');
  foundI.forEach(s => {
    console.log(`  Block ${s.height}: ${s.date.toISOString()}`);
  });
}

console.log('\n');
if (foundR.length > 0 || foundI.length > 0) {
  console.log('✅ caribu66@ IS currently staking!');
  console.log(
    '   If using R-address, those stakes are NOT tracked by the scanner.'
  );
} else {
  console.log('❌ No recent stakes found for either address');
}
