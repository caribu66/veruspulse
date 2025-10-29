#!/usr/bin/env node

/**
 * Incremental VerusID Staker Scanner
 * Scans from last processed block to current tip
 * Updates database with new stakes
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class IncrementalStakerScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.lastScannedBlock = null;
    this.currentTip = null;
    this.newStakesFound = 0;
    this.blocksProcessed = 0;
    this.posBlocksFound = 0;
    this.startTime = Date.now();
  }

  async initialize() {
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║     INCREMENTAL STAKER SCANNER - New Stakes Update       ║');
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log('');
  }

  async getLastScannedBlock() {
    try {
      const result = await this.pool.query(`
        SELECT MAX(block_height) as last_block 
        FROM staking_rewards
      `);

      const lastBlock = result.rows[0]?.last_block || 0;
      console.log(`📊 Last scanned block: ${lastBlock}`);
      return lastBlock;
    } catch (error) {
      console.error('❌ Error getting last scanned block:', error.message);
      return 0;
    }
  }

  async getCurrentBlockchainHeight() {
    try {
      const height = parseInt(
        execSync('/home/explorer/verus-cli/verus getblockcount', {
          encoding: 'utf8',
        }).trim()
      );
      return height;
    } catch (error) {
      try {
        const height = parseInt(
          execSync('verus getblockcount', { encoding: 'utf8' }).trim()
        );
        return height;
      } catch (e) {
        console.error('❌ Error getting blockchain height:', error.message);
        return 0;
      }
    }
  }

  async rpcCall(method, params = []) {
    try {
      const result = execSync(
        `/home/explorer/verus-cli/verus ${method} ${params.map(p => (typeof p === 'string' ? `"${p}"` : p)).join(' ')}`,
        { encoding: 'utf8' }
      );
      return JSON.parse(result.trim());
    } catch (error) {
      throw new Error(`RPC Error: ${error.message}`);
    }
  }

  async getBlock(hash) {
    try {
      const result = execSync(
        `/home/explorer/verus-cli/verus getblock ${hash} 2`,
        { encoding: 'utf8' }
      );
      return JSON.parse(result);
    } catch (error) {
      console.error(`❌ Error getting block ${hash}:`, error.message);
      return null;
    }
  }

  async extractStakeAmountFromUTXOs(identityAddress) {
    try {
      const rpcUser = process.env.VERUS_RPC_USER || 'verus';
      const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
      const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
      const rpcPort = process.env.VERUS_RPC_PORT || '18843';

      // Get current block height
      const blockCmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '{"jsonrpc":"1.0","id":"scanner","method":"getblockcount","params":[]}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;
      const blockResult = JSON.parse(
        execSync(blockCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
      );
      const currentBlockHeight = blockResult.result;

      // Get UTXOs for this identity
      const utxoCmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '{"jsonrpc":"1.0","id":"scanner","method":"getaddressutxos","params":[{"addresses":["${identityAddress}"]}]}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;
      const utxoResult = JSON.parse(
        execSync(utxoCmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
      );
      const utxos = utxoResult.result;

      if (!utxos || utxos.length === 0) {
        return null;
      }

      // Filter UTXOs with 150+ confirmations
      const stakingUtxos = utxos.filter(utxo => {
        const vrsc = utxo.satoshis / 100000000;
        const confirmations = currentBlockHeight - utxo.height + 1;
        return vrsc >= 0.001 && confirmations >= 150;
      });

      if (stakingUtxos.length === 0) {
        return null;
      }

      // Calculate average stake amount
      const totalStakingSats = stakingUtxos.reduce(
        (sum, utxo) => sum + utxo.satoshis,
        0
      );
      const avgStakeAmountSats = totalStakingSats / stakingUtxos.length;

      return Math.round(avgStakeAmountSats);
    } catch (error) {
      throw new Error(`UTXO analysis failed: ${error.message}`);
    }
  }

  async getBlockHash(height) {
    try {
      const result = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${height}`,
        { encoding: 'utf8' }
      );
      return result.trim();
    } catch (error) {
      console.error(
        `❌ Error getting block hash for height ${height}:`,
        error.message
      );
      return null;
    }
  }

  async isProofOfStakeBlock(block) {
    // OINK70'S PROVEN METHOD
    return block.validationtype === 'stake';
  }

  async extractAllStakesFromBlock(block) {
    const stakes = [];

    if (!block.tx || block.tx.length === 0) {
      return stakes;
    }

    const coinstakeTx = block.tx[0];
    if (!coinstakeTx.vout || coinstakeTx.vout.length === 0) {
      return stakes;
    }

    // Check ALL vouts for addresses
    for (let i = 0; i < coinstakeTx.vout.length; i++) {
      const vout = coinstakeTx.vout[i];

      if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
        for (const address of vout.scriptPubKey.addresses) {
          stakes.push({
            address: address,
            txid: coinstakeTx.txid,
            vout: i,
            block_height: block.height,
            block_hash: block.hash,
            block_time: new Date(block.time * 1000),
            amount_sats: Math.round(vout.value * 100000000),
            classifier: 'staking_reward',
            source_address: address,
            is_verusid: address.startsWith('i'),
          });
        }
      }
    }

    return stakes;
  }

  async ensureIdentityExists(address) {
    try {
      const checkResult = await this.pool.query(
        'SELECT identity_address FROM identities WHERE identity_address = $1',
        [address]
      );

      if (checkResult.rows.length > 0) {
        return; // Already exists
      }

      // Try to get identity info from RPC
      try {
        const identityInfo = await this.rpcCall('getidentity', [address]);
        if (identityInfo && identityInfo.name) {
          await this.pool.query(
            `INSERT INTO identities (identity_address, friendly_name, base_name, last_refreshed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (identity_address) DO NOTHING`,
            [
              address,
              identityInfo.friendlyname || identityInfo.name + '@',
              identityInfo.name,
            ]
          );
        }
      } catch (error) {
        // If can't get identity info, just create a basic entry
        await this.pool.query(
          `INSERT INTO identities (identity_address, last_refreshed_at)
           VALUES ($1, NOW())
           ON CONFLICT (identity_address) DO NOTHING`,
          [address]
        );
      }
    } catch (error) {
      console.error(
        `⚠️  Error ensuring identity exists for ${address}:`,
        error.message
      );
    }
  }

  async saveStakes(stakes) {
    const affectedAddresses = new Set();
    
    for (const stake of stakes) {
      try {
        // CRITICAL: Only save stakes where rewards go to I-addresses
        // This ensures we only track stakers who stake with their VerusID and receive rewards to it
        if (!stake.is_verusid) {
          continue;
        }

        // Additional validation: source_address must also be an I-address
        // This ensures the reward address matches the staking identity
        if (!stake.source_address.startsWith('i')) {
          continue; // Skip if reward goes to R-address
        }

        // Only record if identity_address and source_address match
        // This ensures we only track pure VerusID staking (I-address to I-address)
        if (stake.address !== stake.source_address) {
          continue; // Skip if addresses don't match
        }

        // Ensure identity exists
        await this.ensureIdentityExists(stake.address);

        // Extract stake amount using simple UTXO analysis
        let stakeAmountSats = null;
        try {
          stakeAmountSats = await this.extractStakeAmountFromUTXOs(
            stake.address
          );
        } catch (extractError) {
          console.log(
            `⚠️  Could not extract stake amount for ${stake.txid}: ${extractError.message}`
          );
        }

        // Insert stake with UTXO-extracted amount
        const result = await this.pool.query(
          `INSERT INTO staking_rewards 
           (identity_address, txid, vout, block_height, block_hash, block_time, 
            amount_sats, classifier, source_address, stake_amount_sats)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (txid, vout) DO NOTHING
           RETURNING identity_address`,
          [
            stake.address,
            stake.txid,
            stake.vout,
            stake.block_height,
            stake.block_hash,
            stake.block_time,
            stake.amount_sats,
            stake.classifier,
            stake.source_address,
            stakeAmountSats,
          ]
        );

        // Track affected addresses (only if a new row was inserted)
        if (result.rows.length > 0) {
          affectedAddresses.add(stake.address);
          this.newStakesFound++;
        }
      } catch (error) {
        console.error(`❌ Error saving stake ${stake.txid}:`, error.message);
      }
    }

    // Update statistics for all affected addresses
    if (affectedAddresses.size > 0) {
      await this.updateStatisticsForAddresses(Array.from(affectedAddresses));
    }
  }

  /**
   * Update verusid_statistics.last_stake_time for affected addresses
   */
  async updateStatisticsForAddresses(identityAddresses) {
    try {
      // Update or create last_stake_time and total_stakes for each affected address
      for (const address of identityAddresses) {
        await this.pool.query(
          `
          INSERT INTO verusid_statistics (
            address, 
            last_stake_time,
            total_stakes,
            total_rewards_satoshis,
            first_stake_time,
            updated_at
          )
          SELECT 
            $1,
            MAX(block_time),
            COUNT(*),
            SUM(amount_sats),
            MIN(block_time),
            NOW()
          FROM staking_rewards 
          WHERE identity_address = $1 
            AND source_address = identity_address
          ON CONFLICT (address) 
          DO UPDATE SET
            last_stake_time = (
              SELECT MAX(block_time) 
              FROM staking_rewards 
              WHERE identity_address = $1 
                AND source_address = identity_address
            ),
            total_stakes = (
              SELECT COUNT(*) 
              FROM staking_rewards 
              WHERE identity_address = $1 
                AND source_address = identity_address
            ),
            total_rewards_satoshis = (
              SELECT SUM(amount_sats) 
              FROM staking_rewards 
              WHERE identity_address = $1 
                AND source_address = identity_address
            ),
            updated_at = NOW()
          `,
          [address]
        );
      }
    } catch (error) {
      console.error(
        `⚠️  Error updating statistics for addresses: ${error.message}`
      );
      // Don't fail the whole operation if statistics update fails
    }
  }

  async scanBlock(height) {
    try {
      const hash = await this.getBlockHash(height);
      if (!hash) return;

      const block = await this.getBlock(hash);
      if (!block) return;

      this.blocksProcessed++;

      if (await this.isProofOfStakeBlock(block)) {
        this.posBlocksFound++;
        const stakes = await this.extractAllStakesFromBlock(block);
        await this.saveStakes(stakes);
      }

      // Progress update every 100 blocks
      if (this.blocksProcessed % 100 === 0) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(
          `📊 Progress: Block ${height} | New stakes: ${this.newStakesFound} | ` +
            `Pos blocks: ${this.posBlocksFound} | Time: ${elapsed}s`
        );
      }
    } catch (error) {
      console.error(`❌ Error scanning block ${height}:`, error.message);
    }
  }

  async scan() {
    await this.initialize();

    // Get scan range
    this.lastScannedBlock = await this.getLastScannedBlock();
    this.currentTip = await this.getCurrentBlockchainHeight();

    if (this.currentTip <= this.lastScannedBlock) {
      console.log('✅ Already up to date! No new blocks to scan.');
      return;
    }

    console.log(
      `🔍 Scanning blocks: ${this.lastScannedBlock + 1} to ${this.currentTip}`
    );
    console.log(
      `📊 Blocks to scan: ${this.currentTip - this.lastScannedBlock}\n`
    );

    // Scan each block
    for (
      let height = this.lastScannedBlock + 1;
      height <= this.currentTip;
      height++
    ) {
      await this.scanBlock(height);
    }

    // Summary
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(
      '\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║                    SCAN COMPLETE                           ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log(`New stakes found:  ${this.newStakesFound}`);
    console.log(`Blocks processed:  ${this.blocksProcessed}`);
    console.log(`PoS blocks:        ${this.posBlocksFound}`);
    console.log(`Time elapsed:      ${elapsed}s`);
    console.log('');
  }
}

// Run scanner
const scanner = new IncrementalStakerScanner();
scanner
  .scan()
  .catch(console.error)
  .finally(() => process.exit(0));
