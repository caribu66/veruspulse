const { execSync } = require('child_process');

const txid = 'cd8b9733e02106d24b7d8c1e6f765afc906827897f809f4836862fd97007977b';

console.log('Checking transaction:', txid);
console.log('');

try {
  const tx = JSON.parse(
    execSync(`/home/explorer/verus-cli/verus gettransaction ${txid}`, {
      encoding: 'utf8',
    })
  );

  console.log('Transaction details:');
  console.log('');

  // Check vouts for addresses
  if (tx.details) {
    tx.details.forEach((detail, i) => {
      console.log(`Vout ${i}: ${detail.address} (${detail.category})`);
    });
  }

  console.log('');
  console.log('Check if any addresses start with "R":');
  if (tx.details) {
    const rAddress = tx.details.find(
      d => d.address && d.address.startsWith('R')
    );
    if (rAddress) {
      console.log('✅ Found R-address:', rAddress.address);
      console.log('   This explains why it was not saved!');
    } else {
      console.log('❌ No R-address found');
      console.log('   All addresses are I-addresses or something else');
    }
  }
} catch (error) {
  console.log('Error:', error.message);
}
