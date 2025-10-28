/**
 * Simple VerusID Cache
 *
 * Stores VerusID staking data in PostgreSQL for fast lookups.
 * No separate service needed - runs inside Next.js.
 */

import { Pool } from 'pg';
import http from 'http';
import https from 'https';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// RPC helper using Node's http module (works in Next.js server-side)
async function verusdRpc(method: string, params: any[] = []) {
  return new Promise((resolve, reject) => {
    const rpcUrl = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
    const rpcUser = process.env.VERUS_RPC_USER || 'verus';
    const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';

    const url = new URL(rpcUrl);
    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: '1',
      method,
      params,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization:
          'Basic ' + Buffer.from(`${rpcUser}:${rpcPass}`).toString('base64'),
      },
    };

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', err => {
      console.error(`[VerusID Cache] RPC ${method} failed:`, err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Resolve VerusID friendly name to I-address
 */
export async function resolveVerusID(input: string): Promise<{
  identityAddress: string;
  name: string;
  friendlyName: string;
  primaryAddresses: string[];
  txid: string;
  height: number;
  version: number;
  minimumsignatures: number;
  parent: string;
  canrevoke: boolean;
  revocationauthority: string;
  recoveryauthority: string;
  timelock: number;
  flags: number;
  status: string;
}> {
  // Normalize input
  let normalized = input.trim();
  if (!normalized.includes('@') && !normalized.startsWith('i')) {
    normalized = `${normalized}.VRSC@`;
  } else if (normalized.includes('@') && !normalized.includes('.')) {
    normalized = normalized.replace('@', '.VRSC@');
  }

  // Get identity from verusd
  const identity = (await verusdRpc('getidentity', [normalized])) as any;

  // Get creation block from identity history (first entry is creation)
  let height = 0;
  try {
    const history = (await verusdRpc('getidentityhistory', [
      identity.identity.identityaddress,
      0,
      0,
    ])) as any;
    if (history?.history && history.history.length > 0) {
      // First entry is the creation
      height = history.history[0].height || 0;
    }
  } catch (error) {
    // If history lookup fails, default to 0
    height = 0;
  }

  return {
    identityAddress: identity.identity.identityaddress,
    name: identity.identity.name || '',
    friendlyName: identity.friendlyname || '',
    primaryAddresses: identity.identity.primaryaddresses || [],
    txid: identity.txid || '',
    height: height,
    version: identity.identity.version || 1,
    minimumsignatures: identity.identity.minimumsignatures || 1,
    parent: identity.identity.parent || '',
    canrevoke: Boolean(identity.identity.revocationauthority),
    revocationauthority: identity.identity.revocationauthority || '',
    recoveryauthority: identity.identity.recoveryauthority || '',
    timelock: identity.identity.timelock || 0,
    flags: identity.identity.flags || 0,
    status: identity.status || 'active',
  };
}

/**
 * Get cached stats for an I-address
 * Returns null if not cached yet
 */
export async function getCachedStats(identityAddress: string) {
  const result = await pool.query(
    `SELECT 
       (SELECT COUNT(*)::int FROM staking_rewards WHERE identity_address = $1 AND source_address = identity_address) as total_rewards,
       (SELECT COALESCE(SUM(amount_sats), 0)::bigint FROM staking_rewards WHERE identity_address = $1 AND source_address = identity_address) as total_sats,
       (SELECT array_agg(json_build_object('day', day, 'rewards', rewards, 'vrsc', (total_sats::numeric / 100000000)) ORDER BY day DESC) 
        FROM staking_daily WHERE identity_address = $1 LIMIT 90) as daily_stats
    `,
    [identityAddress]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    totalRewards: Number(row.total_sats) / 1e8,
    rewardCount: row.total_rewards,
    dailyStats: row.daily_stats || [],
  };
}

/**
 * Check if identity is cached
 */
export async function isCached(identityAddress: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM identities WHERE identity_address = $1',
    [identityAddress]
  );
  return result.rows.length > 0;
}

/**
 * Get cached identity by friendly name or I-address
 * Returns null if not in cache
 */
export async function getCachedIdentity(input: string): Promise<{
  identityAddress: string;
  name: string;
  friendlyName: string;
  primaryAddresses: string[];
} | null> {
  // Normalize input for friendly name lookup
  let normalized = input.trim();
  if (!normalized.includes('@') && !normalized.startsWith('i')) {
    normalized = `${normalized}.VRSC@`;
  } else if (normalized.includes('@') && !normalized.includes('.')) {
    normalized = normalized.replace('@', '.VRSC@');
  }

  // Try to find by friendly name or I-address (case-insensitive for friendly name)
  const result = await pool.query(
    `SELECT identity_address, base_name, friendly_name, primary_addresses 
     FROM identities 
     WHERE LOWER(friendly_name) = LOWER($1) OR identity_address = $2`,
    [normalized, input]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Parse primary_addresses if it's a string (shouldn't happen with JSONB, but just in case)
  let primaryAddresses = row.primary_addresses || [];
  if (typeof primaryAddresses === 'string') {
    primaryAddresses = JSON.parse(primaryAddresses);
  }

  return {
    identityAddress: row.identity_address,
    name: row.base_name,
    friendlyName: row.friendly_name,
    primaryAddresses: primaryAddresses,
  };
}

/**
 * Cache identity data (call this on first lookup)
 * This runs async in the background - doesn't block the response
 */
export async function cacheIdentity(
  identityAddress: string,
  name: string,
  friendlyName: string,
  primaryAddresses: string[]
): Promise<void> {
  // Store identity (primary_addresses as JSON array)
  await pool.query(
    `INSERT INTO identities (identity_address, base_name, friendly_name, primary_addresses, last_refreshed_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (identity_address) 
     DO UPDATE SET base_name = $2, friendly_name = $3, primary_addresses = $4, last_refreshed_at = NOW()`,
    [identityAddress, name, friendlyName, JSON.stringify(primaryAddresses)]
  );

  // Start background indexing (don't await - let it run async)
  indexIdentityInBackground(identityAddress).catch(err =>
    console.error('Background indexing error:', err)
  );
}

/**
 * Index all rewards for an identity (background task)
 */
async function indexIdentityInBackground(
  identityAddress: string
): Promise<void> {
  console.log(
    `[VerusID Cache] Starting background index for ${identityAddress}`
  );

  try {
    // Get all transactions for this address
    const txids = (await verusdRpc('getaddresstxids', [
      { addresses: [identityAddress] },
    ])) as any[];

    console.log(`[VerusID Cache] Found ${txids.length} transactions to index`);

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < txids.length; i++) {
      const txid = txids[i];

      // Get transaction details
      const tx = (await verusdRpc('getrawtransaction', [txid, 1])) as any;
      if (!tx.blockhash) continue; // Skip mempool txs

      // Get block info
      const block = (await verusdRpc('getblock', [tx.blockhash, 1])) as any;

      // Find outputs paying to this identity
      const isCoinbase = !!tx.vin?.[0]?.coinbase;

      if (isCoinbase) {
        // For staking rewards (coinbase), only count the smallest output as the reward
        // The largest output is typically the stake return, not the reward
        const myOutputs = tx.vout
          .map((vout: any, voutIndex: number) => ({ vout, voutIndex }))
          .filter(({ vout }: any) => {
            const addresses = vout.scriptPubKey?.addresses || [];
            return addresses.includes(identityAddress);
          });

        if (myOutputs.length > 0) {
          // Sort by value to find the smallest (the actual reward)
          myOutputs.sort((a: any, b: any) => a.vout.value - b.vout.value);

          // Only insert the smallest output (the reward, not the stake return)
          const rewardOutput = myOutputs[0];

          // Fix for data corruption: Handle both VRSC and satoshi units
          // If value is > 1000, it's likely already in satoshis (1000 VRSC = 100B satoshis)
          // If value is < 1000, it's likely in VRSC units
          let amountSats;
          if (rewardOutput.vout.value > 1000) {
            // Value is already in satoshis, use as-is
            amountSats = Math.round(rewardOutput.vout.value);
          } else {
            // Value is in VRSC, convert to satoshis
            amountSats = Math.round(rewardOutput.vout.value * 1e8);
          }

          // Sanity check: Cap at 1M VRSC (100B satoshis) to prevent corruption
          const maxReasonableSats = 100000000000; // 1M VRSC
          amountSats = Math.min(amountSats, maxReasonableSats);

          await pool.query(
            `INSERT INTO staking_rewards 
             (identity_address, txid, vout, block_height, block_hash, block_time, amount_sats, classifier)
             VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8)
             ON CONFLICT (txid, vout) DO NOTHING`,
            [
              identityAddress,
              txid,
              rewardOutput.voutIndex,
              block.height,
              block.hash,
              block.time,
              amountSats,
              'coinbase',
            ]
          );
        }
      } else {
        // For non-coinbase transactions, store all outputs (regular transactions)
        for (let voutIndex = 0; voutIndex < tx.vout.length; voutIndex++) {
          const vout = tx.vout[voutIndex];
          const addresses = vout.scriptPubKey?.addresses || [];

          if (addresses.includes(identityAddress)) {
            // Fix for data corruption: Handle both VRSC and satoshi units
            let amountSats;
            if (vout.value > 1000) {
              // Value is already in satoshis, use as-is
              amountSats = Math.round(vout.value);
            } else {
              // Value is in VRSC, convert to satoshis
              amountSats = Math.round(vout.value * 1e8);
            }

            // Sanity check: Cap at 1M VRSC (100B satoshis) to prevent corruption
            const maxReasonableSats = 100000000000; // 1M VRSC
            amountSats = Math.min(amountSats, maxReasonableSats);

            await pool.query(
              `INSERT INTO staking_rewards 
               (identity_address, txid, vout, block_height, block_hash, block_time, amount_sats, classifier)
               VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8)
               ON CONFLICT (txid, vout) DO NOTHING`,
              [
                identityAddress,
                txid,
                voutIndex,
                block.height,
                block.hash,
                block.time,
                amountSats,
                'regular',
              ]
            );
          }
        }
      }

      // Progress update every 100 txs
      if ((i + 1) % 100 === 0) {
        console.log(
          `[VerusID Cache] Indexed ${i + 1}/${txids.length} transactions`
        );
      }
    }

    // Refresh materialized view
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY staking_daily');

    console.log(`[VerusID Cache] ✅ Completed indexing ${identityAddress}`);
  } catch (error) {
    console.error(
      `[VerusID Cache] ❌ Indexing failed for ${identityAddress}:`,
      error
    );
    throw error;
  }
}

/**
 * Get cached balance for an address
 * Returns null if not cached or cache is stale (older than 5 minutes)
 */
export async function getCachedBalance(address: string): Promise<{
  balance: number;
  received: number;
  sent: number;
} | null> {
  const result = await pool.query(
    `SELECT balance, received, sent, cached_at
     FROM address_balances 
     WHERE address = $1 AND cached_at > NOW() - INTERVAL '5 minutes'`,
    [address]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    balance: Number(row.balance),
    received: Number(row.received),
    sent: Number(row.sent),
  };
}

/**
 * Cache balance for an address
 * Stores balance in satoshis
 */
export async function cacheBalance(
  address: string,
  balance: number,
  received: number,
  sent: number
): Promise<void> {
  await pool.query(
    `INSERT INTO address_balances (address, balance, received, sent, cached_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (address) 
     DO UPDATE SET balance = $2, received = $3, sent = $4, cached_at = NOW(), updated_at = NOW()`,
    [address, balance, received, sent]
  );
}

/**
 * Get cached balances for multiple addresses at once
 * Returns a Map of address -> balance data (only for cached entries)
 */
export async function getCachedBalances(addresses: string[]): Promise<
  Map<
    string,
    {
      balance: number;
      received: number;
      sent: number;
    }
  >
> {
  if (addresses.length === 0) return new Map();

  const result = await pool.query(
    `SELECT address, balance, received, sent
     FROM address_balances 
     WHERE address = ANY($1) AND cached_at > NOW() - INTERVAL '5 minutes'`,
    [addresses]
  );

  const balanceMap = new Map();
  for (const row of result.rows) {
    balanceMap.set(row.address, {
      balance: Number(row.balance),
      received: Number(row.received),
      sent: Number(row.sent),
    });
  }

  return balanceMap;
}

export { pool };
