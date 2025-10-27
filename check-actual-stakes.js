const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

console.log('Checking recent blockchain activity for caribu66@...\n');

// Check recent blocks for stakes from this address
// We'll check a few blocks after April 2023 to see if there are stakes

async function checkRecentBlocks() {
  // Check blocks around May 2023
  const startBlock = 2500000;
  const endBlock = 2550000;

  console.log(`Scanning blocks ${startBlock} to ${endBlock}...`);
  console.log('Looking for stakes from: ' + address);
  console.log('');

  let found = 0;

  for (
    let height = startBlock;
    height <= Math.min(startBlock + 1000, endBlock);
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
                console.log(
                  `Found stake at block ${height}: ${new Date(blockData.time * 1000).toISOString()}`
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

    if (height % 100 === 0) {
      process.stdout.write(`\rChecked ${height - startBlock} blocks...`);
    }
  }

  console.log('\n');
  console.log(`Found ${found} stakes from caribu66@ after April 2023`);
}

checkRecentBlocks().catch(console.error);
