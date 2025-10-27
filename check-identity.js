const { execSync } = require('child_process');

console.log('Checking VerusID: caribu66@');
console.log('');

// Try to get the address for this VerusID
try {
  const result = execSync(
    '/home/explorer/verus-cli/verus getidentity "caribu66@" 2>&1',
    { encoding: 'utf8' }
  );

  if (result.includes('could not be found') || result.includes('404')) {
    console.log('❌ VerusID "caribu66@" not found on blockchain');
    console.log('');
    console.log('Possible reasons:');
    console.log('  1. The identity may have been revoked or expired');
    console.log('  2. The identity was never confirmed');
    console.log('  3. Different name/version used');
  } else {
    console.log('Identity info:');
    console.log(result);
  }
} catch (error) {
  console.log('Could not get identity info:', error.message);
}

console.log('');
console.log(
  'Note: The I-address iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB may still be staking'
);
console.log('      even if the VerusID "caribu66@" is no longer active.');
