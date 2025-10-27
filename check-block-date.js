const { execSync } = require('child_process');

console.log('Checking block 2,498,070...');

try {
  const hash = execSync('/home/explorer/verus-cli/verus getblockhash 2498070', {
    encoding: 'utf8',
  }).trim();
  const block = JSON.parse(
    execSync(`/home/explorer/verus-cli/verus getblock ${hash} 2`, {
      encoding: 'utf8',
    })
  );

  console.log(`Block timestamp: ${new Date(block.time * 1000).toISOString()}`);
  console.log(`Block height: ${block.height}`);
} catch (error) {
  console.log('Error:', error.message);
}

// Check what the current blockchain height is
console.log('');
const currentHeight = parseInt(
  execSync('/home/explorer/verus-cli/verus getblockcount', {
    encoding: 'utf8',
  }).trim()
);
console.log(`Current blockchain height: ${currentHeight.toLocaleString()}`);
