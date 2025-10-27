#!/usr/bin/env node

/**
 * VerusID Creation Scanner
 * Scans blockchain to find all VerusID creation transactions
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class VerusIDCreationScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.creationsFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.startBlock = 800200; // VerusID activation block
    this.endBlock = null; // Will be set to current tip
  }

  async initialize() {
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║   VERUSID CREATION SCANNER                                ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log('');

    this.endBlock = await this.getCurrentBlockchainHeight();
    console.log(
      `🔧 Scanning from block ${this.startBlock.toLocaleString()} to ${this.endBlock.toLocaleString()}`
    );
    console.log('🎯 Finding all VerusID creation transactions');
    console.log('');
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
      console.error('❌ Error getting blockchain height:', error.message);
      return 0;
    }
  }

  async extractIdentityCreations(block) {
    const creations = [];

    if (!block.tx || block.tx.length === 0) {
      return creations;
    }

    // Check ALL transactions in the block (not just coinstake)
    for (const tx of block.tx) {
      if (!tx.vout || tx.vout.length === 0) {
        continue;
      }

      for (const vout of tx.vout) {
        // Check for identity creation in scriptPubKey
        if (vout.scriptPubKey && vout.scriptPubKey.identityprimary) {
          const identity = vout.scriptPubKey.identityprimary;
          creations.push({
            identityaddress: identity.identityaddress,
            name: identity.name,
            txid: tx.txid,
            block_height: block.height,
            block_hash: block.hash,
            block_time: new Date(block.time * 1000),
          });
        }
      }
    }

    return creations;
  }

  async saveIdentityCreations(identityCreations) {
    if (identityCreations.length === 0) return;

    for (const creation of identityCreations) {
      try {
        // Try to resolve friendly name
        let friendlyName = `${creation.name}.VRSC@`;
        try {
          const result = execSync(
            `/home/explorer/verus-cli/verus getidentity ${creation.identityaddress} 2>/dev/null | jq -r '.friendlyname'`,
            { encoding: 'utf8' }
          ).trim();
          if (result && result !== 'null') {
            friendlyName = result;
          }
        } catch (e) {
          // Use default
        }

        await this.pool.query(
          `INSERT INTO identities 
           (identity_address, base_name, friendly_name, creation_block_height, creation_txid, creation_timestamp, first_seen_block)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (identity_address) 
           DO UPDATE SET
             creation_block_height = COALESCE(identities.creation_block_height, EXCLUDED.creation_block_height),
             creation_txid = COALESCE(identities.creation_txid, EXCLUDED.creation_txid),
             creation_timestamp = COALESCE(identities.creation_timestamp, EXCLUDED.creation_timestamp),
             base_name = COALESCE(identities.base_name, EXCLUDED.base_name),
             friendly_name = COALESCE(identities.friendly_name, EXCLUDED.friendly_name),
             first_seen_block = LEAST(identities.first_seen_block, EXCLUDED.first_seen_block)`,
          [
            creation.identityaddress,
            creation.name,
            friendlyName,
            creation.block_height,
            creation.txid,
            creation.block_time,
            creation.block_height,
          ]
        );

        this.creationsFound++;
        console.log(
          `   ✓ [${this.creationsFound}] ${friendlyName} created in block ${creation.block_height}`
        );
      } catch (error) {
        console.error(`⚠️  Error saving identity creation:`, error.message);
      }
    }
  }

  async processBlock(blockHeight) {
    try {
      const blockHash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      const blockData = JSON.parse(
        execSync(`/home/explorer/verus-cli/verus getblock ${blockHash} 2`, {
          encoding: 'utf8',
        })
      );

      const identityCreations = await this.extractIdentityCreations(blockData);

      if (identityCreations.length > 0) {
        await this.saveIdentityCreations(identityCreations);
      }

      this.blocksProcessed++;

      // Progress update every 5000 blocks
      if (this.blocksProcessed % 5000 === 0) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const progress = (
          (this.blocksProcessed / (this.endBlock - this.startBlock + 1)) *
          100
        ).toFixed(1);
        console.log(
          `📊 Block ${blockHeight.toLocaleString()} | Creations: ${this.creationsFound} | Progress: ${progress}% | Time: ${elapsed}s`
        );
      }

      return true;
    } catch (error) {
      console.error(`❌ Error processing block ${blockHeight}:`, error.message);
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();

      console.log(
        `🔍 Starting scan from block ${this.startBlock} to ${this.endBlock}...`
      );
      console.log('');

      for (let height = this.startBlock; height <= this.endBlock; height++) {
        await this.processBlock(height);
      }

      // Summary
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      console.log('');
      console.log(
        '╔═══════════════════════════════════════════════════════════╗'
      );
      console.log(
        '║                    SCAN COMPLETE                           ║'
      );
      console.log(
        '╚═══════════════════════════════════════════════════════════╝'
      );
      console.log(`Identity creations found:  ${this.creationsFound}`);
      console.log(
        `Blocks processed:         ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(`Time elapsed:             ${elapsed}s`);
      console.log('');
    } catch (error) {
      console.error('❌ Scanner error:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run scanner
const scanner = new VerusIDCreationScanner();
scanner
  .run()
  .catch(console.error)
  .finally(() => process.exit(0));
