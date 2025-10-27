const { execSync } = require('child_process');

console.log('🔍 Checking for PoW blocks...');
console.log('');

// Check a few blocks to see their validationtype
const blocksToCheck = [1780000, 1780500, 1781000, 1781500, 1782000];

for (const height of blocksToCheck) {
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

    console.log(
      `Block ${height}: validationtype="${blockData.validationtype}"`
    );
  } catch (error) {
    console.log(`Block ${height}: Error - ${error.message}`);
  }
}

console.log('');
console.log('If all show "stake", then either:');
console.log('1. The year actually has 480k blocks (not 240k)');
console.log('2. PoW blocks use a different field to identify');
console.log('3. Verus is NOT 50/50 but predominantly PoS');
