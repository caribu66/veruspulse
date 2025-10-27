const { execSync } = require('child_process');

const address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

console.log('Checking transaction history for caribu66@...\n');

try {
  // Get recent transactions for this address
  const result = execSync(
    `/home/explorer/verus-cli/verus listunspent 0 99999999 "[\"${address}\"]"`,
    { encoding: 'utf8' }
  );

  const utxos = JSON.parse(result);
  console.log(`Found ${utxos.length} UTXOs for this address\n`);

  if (utxos.length > 0) {
    console.log('Recent UTXOs:');
    utxos.slice(0, 10).forEach((utxo, i) => {
      const amount = (utxo.amount * 100000000).toFixed(8);
      console.log(
        `  ${i + 1}. ${amount} VRSC - Block ${utxo.height} - ${utxo.txid.substring(0, 16)}...`
      );
    });
  }
} catch (error) {
  console.log('Could not get UTXOs:', error.message);
}

// Also try to get balance
try {
  const balance = execSync(
    `/home/explorer/verus-cli/verus getaddressbalance "{\"addresses\":[\"${address}\"]}"`,
    { encoding: 'utf8' }
  );
  console.log('\nAddress balance info:');
  console.log(balance);
} catch (error) {
  console.log('Could not get balance:', error.message);
}
