const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

// Get the query from command line arguments
const query = process.argv[2];

if (!query) {
  console.log('Usage: node query-db.js "SELECT * FROM identities LIMIT 10"');
  console.log('');
  console.log('Common queries:');
  console.log('  node query-db.js "SELECT COUNT(*) FROM staking_rewards"');
  console.log(
    '  node query-db.js "SELECT identity_address, COUNT(*) FROM staking_rewards GROUP BY identity_address ORDER BY COUNT(*) DESC LIMIT 10"'
  );
  console.log(
    '  node query-db.js "SELECT * FROM staking_rewards WHERE identity_address = \\"iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB\\" ORDER BY block_height DESC LIMIT 10"'
  );
  process.exit(1);
}

async function runQuery() {
  try {
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('No results found.');
      return;
    }

    // Print column names
    const columns = Object.keys(result.rows[0]);
    console.log(columns.join(' | '));
    console.log('-'.repeat(columns.join(' | ').length));

    // Print rows (limit to first 50 for display)
    result.rows.slice(0, 50).forEach(row => {
      console.log(columns.map(col => row[col] || '').join(' | '));
    });

    if (result.rows.length > 50) {
      console.log(`... and ${result.rows.length - 50} more rows`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

runQuery();
