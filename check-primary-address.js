const { execSync } = require('child_process');

console.log('Checking caribu66@ identity primary address...\n');

try {
  const identity = JSON.parse(
    execSync('/home/explorer/verus-cli/verus getidentity caribu66@', {
      encoding: 'utf8',
    })
  );

  console.log('Primary addresses:', identity.identity.primaryaddresses);
  console.log('');

  // Check if the primary address matches what we've been looking for
  const iAddr = identity.identity.identityaddress;
  const rAddr = identity.identity.primaryaddresses[0];

  console.log(`I-address: ${iAddr}`);
  console.log(`Primary R-address: ${rAddr}`);
  console.log('');
  console.log(
    'NOTE: VerusID stakes can go to either the I-address or R-address.'
  );
  console.log('Our scanner only tracks I-address stakes.');
  console.log('');
  console.log('If caribu66@ has been staking to the R-address,');
  console.log('those stakes would NOT be in our database.');
  console.log('');
} catch (error) {
  console.log('Error:', error.message);
}
