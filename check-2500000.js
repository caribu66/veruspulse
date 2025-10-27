const { execSync } = require('child_process');

console.log('Checking block 2,500,000 timestamp...');

try {
  const hash = execSync('/home/explorer/verus-cli/verus getblockhash 2500000', {
    encoding: 'utf8',
  }).trim();
  const block = JSON.parse(
    execSync(`/home/explorer/verus-cli/verus getblock ${hash} 2`, {
      encoding: 'utf8',
    })
  );

  const date = new Date(block.time * 1000);
  console.log(`Block 2,500,000 timestamp: ${date.toISOString()}`);
  console.log(
    `This is: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  );
  console.log('');

  if (date.getFullYear() === 2023 && date.getMonth() < 10) {
    console.log('⚠️  Block 2,500,000 is only in 2023, not December 2025!');
    console.log('   Our 2025 scanner did NOT scan October 2025 blocks.');
    console.log('   We need to scan further blocks to get October 2025 data.');
  } else if (date.getFullYear() === 2025) {
    console.log(
      '✅ Block 2,500,000 is in 2025 - scanner should have covered it'
    );
  }

  const currentHeight = parseInt(
    execSync('/home/explorer/verus-cli/verus getblockcount', {
      encoding: 'utf8',
    }).trim()
  );
  console.log('');
  console.log(`Current blockchain height: ${currentHeight.toLocaleString()}`);
  console.log('');

  // Check what block corresponds to October 2025
  console.log('Need to find what block corresponds to October 2025...');
  console.log('This would require scanning forward from block 2,500,000');
} catch (error) {
  console.log('Error:', error.message);
}
