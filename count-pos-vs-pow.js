const { execSync } = require('child_process');

console.log('📊 Counting PoS vs PoW blocks...');
console.log('');

let stakeCount = 0;
let workCount = 0;
const sampleSize = 1000;
const startBlock = 1780000;

for (let i = 0; i < sampleSize; i++) {
  const height = startBlock + i;
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

    if (blockData.validationtype === 'stake') {
      stakeCount++;
    } else if (blockData.validationtype === 'work') {
      workCount++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Sample ${i + 1}/${sampleSize}...`);
    }
  } catch (error) {
    // Skip errors
  }
}

console.log('');
console.log('📊 Results from sample of 1000 blocks:');
console.log(
  `   PoS blocks (stake): ${stakeCount} (${((stakeCount / sampleSize) * 100).toFixed(1)}%)`
);
console.log(
  `   PoW blocks (work): ${workCount} (${((workCount / sampleSize) * 100).toFixed(1)}%)`
);
console.log('');
console.log('Extrapolating to full year:');
console.log(
  `   ~${Math.round((stakeCount / sampleSize) * 240000)} PoS blocks per year`
);
console.log(
  `   ~${Math.round((workCount / sampleSize) * 240000)} PoW blocks per year`
);
