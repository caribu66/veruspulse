const { execSync } = require('child_process');

const rAddress = 'RFd31DGN7uFtbTpVgURBgFVnUv8dsxoaAg';

console.log('Searching for recent R-address stakes...\n');
console.log(`Checking: ${rAddress}`);
console.log('');

const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);
console.log(`Current height: ${currentHeight}\n`);

console.log(`Checking blocks ${currentHeight - 10000} to ${currentHeight}...`);

let found = 0;
const stakes = [];

for (let height = currentHeight - 10000; height <= currentHeight; height++) {
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
                found++;
                const date = new Date(blockData.time * 1000);
                stakes.push({ height, date, amount: vout.value });
                if (found <= 10) {
                  console.log(
                    `  Block ${height} (${date.toISOString()}): ${vout.value} VRSC`
                  );
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip
  }

  if (height % 1000 === 0) {
    process.stdout.write(
      `\rChecked ${height - (currentHeight - 10000)} blocks...`
    );
  }
}

console.log('\n');
console.log(`Total R-address stakes found: ${found}`);

if (found > 0) {
  console.log('\n✅ caribu66@ HAS been staking to the R-address!');
  console.log('   These stakes are NOT in our database');
  console.log('   because our scanner only tracks I-address stakes.');
} else {
  console.log('❌ No R-address stakes found either.');
}
