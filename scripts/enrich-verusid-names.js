const { Pool } = require('pg');

const DB_CONN =
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';

const VERUS_RPC_CONFIG = {
  host: 'localhost',
  port: 18843,
  username: 'verus',
  password: '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb',
};

const pool = new Pool({
  connectionString: DB_CONN,
});

// Simple RPC client
class SimpleRPCClient {
  constructor(config) {
    this.url = `http://${config.host}:${config.port}`;
    this.username = config.username;
    this.password = config.password;
  }

  async call(method, params = []) {
    const auth = Buffer.from(`${this.username}:${this.password}`).toString(
      'base64'
    );
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }
    return data.result;
  }

  async getIdentity(identity) {
    return this.call('getidentity', [identity]);
  }
}

const rpcClient = new SimpleRPCClient(VERUS_RPC_CONFIG);

async function enrichVerusIDs() {
  console.log('🔍 Fetching all VerusID I-addresses from database...');

  // Get all unique identity addresses from staking_rewards
  const result = await pool.query(`
    SELECT DISTINCT identity_address 
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
    ORDER BY identity_address
  `);

  const identities = result.rows;
  console.log(`📊 Found ${identities.length} VerusIDs to enrich\n`);

  let successCount = 0;
  let errorCount = 0;
  let updatedCount = 0;
  let alreadyHadName = 0;

  for (let i = 0; i < identities.length; i++) {
    const identityAddress = identities[i].identity_address;

    try {
      // Check if we already have the name in the database
      const existing = await pool.query(
        'SELECT friendly_name, base_name FROM identities WHERE identity_address = $1',
        [identityAddress]
      );

      if (existing.rows.length > 0 && existing.rows[0].friendly_name) {
        // Try to resolve again to ensure we have the latest data
        const identity = await rpcClient.getIdentity(identityAddress);

        if (identity && identity.name) {
          const friendlyName = identity.friendlyname || identity.name + '@';
          const baseName = identity.name;

          if (
            existing.rows[0].friendly_name !== friendlyName ||
            existing.rows[0].base_name !== baseName
          ) {
            await pool.query(
              `UPDATE identities 
               SET friendly_name = $1, base_name = $2, last_refreshed_at = NOW()
               WHERE identity_address = $3`,
              [friendlyName, baseName, identityAddress]
            );
            updatedCount++;
            console.log(
              `✓ [${i + 1}/${identities.length}] Updated: ${friendlyName} (${identityAddress})`
            );
          } else {
            alreadyHadName++;
          }
        }
      } else {
        // New identity - try to resolve
        const identity = await rpcClient.getIdentity(identityAddress);

        if (identity && identity.name) {
          const friendlyName = identity.friendlyname || identity.name + '@';
          const baseName = identity.name;

          // Insert or update
          await pool.query(
            `INSERT INTO identities (identity_address, friendly_name, base_name, last_refreshed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (identity_address) 
             DO UPDATE SET 
               friendly_name = EXCLUDED.friendly_name,
               base_name = EXCLUDED.base_name,
               last_refreshed_at = EXCLUDED.last_refreshed_at`,
            [identityAddress, friendlyName, baseName]
          );

          updatedCount++;
          console.log(
            `✓ [${i + 1}/${identities.length}] Resolved: ${friendlyName} (${identityAddress})`
          );
        } else {
          console.log(
            `⚠ [${i + 1}/${identities.length}] No name found for ${identityAddress}`
          );
        }
      }

      successCount++;

      // Be nice to the RPC daemon
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errorCount++;
      console.error(
        `✗ [${i + 1}/${identities.length}] Error for ${identityAddress}: ${error.message}`
      );

      // On RPC errors, wait longer before retrying
      if (error.message.includes('RPC Error')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Progress indicator every 50 identities
    if ((i + 1) % 50 === 0) {
      console.log(
        `\n📊 Progress: ${i + 1}/${identities.length} (${(((i + 1) / identities.length) * 100).toFixed(1)}%)`
      );
      console.log(
        `   ✓ Success: ${successCount} | ✗ Errors: ${errorCount} | 📝 Updated: ${updatedCount} | ♻ Already had name: ${alreadyHadName}\n`
      );
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 VERUSID ENRICHMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total identities processed: ${identities.length}`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`📝 Names updated/resolved: ${updatedCount}`);
  console.log(`♻ Already had names: ${alreadyHadName}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

enrichVerusIDs()
  .catch(console.error)
  .finally(() => pool.end());
