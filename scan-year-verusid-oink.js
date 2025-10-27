#!/usr/bin/env node

/**
 * Year-based VerusID Scanner using Oink70's Method
 * Scans from December 2020 to December 2021 (one year)
 * Uses Oink70's proven PoS detection method
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class YearVerusIDScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.posBlocksFound = 0;
    this.startTime = Date.now();
    this.startBlock = 2500000; // Where previous scan ended
    this.endBlock = 4000000; // Current tip and beyond
  }

  async initialize() {
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log("║   YEAR VERUSID SCANNER - Using Oink70's Method         ║");
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log('');
    console.log("🔧 Using Oink70's proven PoS detection method");
    console.log('📅 Scanning: April 2023 to Current Tip');
    console.log('🎯 Extracting ALL stake data from PoS blocks');
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

  async isProofOfStakeBlock(block) {
    // OINK70'S PROVEN METHOD: Only validationtype="stake" is PoS
    return block.validationtype === 'stake';
  }

  async extractAllStakesFromBlock(block) {
    const stakes = [];
    const identityCreations = []; // Track identity creations

    if (!block.tx || block.tx.length === 0) {
      return { stakes, identityCreations };
    }

    // Coinstake transaction (first transaction)
    const coinstakeTx = block.tx[0];
    if (!coinstakeTx.vout || coinstakeTx.vout.length === 0) {
      return { stakes, identityCreations };
    }

    // Check ALL vouts for addresses and identity creations
    for (let i = 0; i < coinstakeTx.vout.length; i++) {
      const vout = coinstakeTx.vout[i];

      // Check for identity creation
      if (vout.scriptPubKey && vout.scriptPubKey.identityprimary) {
        const identity = vout.scriptPubKey.identityprimary;
        identityCreations.push({
          identityaddress: identity.identityaddress,
          name: identity.name,
          txid: coinstakeTx.txid,
          block_height: block.height,
          block_hash: block.hash,
          block_time: new Date(block.time * 1000),
        });
      }

      if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
        for (const address of vout.scriptPubKey.addresses) {
          // Store ALL addresses, not just I-addresses
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

    return { stakes, identityCreations };
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
             friendly_name = COALESCE(identities.friendly_name, EXCLUDED.friendly_name)`,
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

        console.log(
          `   ✓ Created identity: ${friendlyName} (${creation.identityaddress}) in block ${creation.block_height}`
        );
      } catch (error) {
        console.error(`⚠️  Error saving identity creation:`, error.message);
      }
    }
  }

  async saveStakes(stakes) {
    if (stakes.length === 0) return true;

    try {
      // CRITICAL: Filter to only pure VerusID staking (I-address to I-address)
      const verusidStakes = stakes.filter(
        s =>
          s.is_verusid &&
          s.source_address.startsWith('i') &&
          s.address === s.source_address
      );

      if (verusidStakes.length === 0) {
        return true;
      }

      const values = verusidStakes
        .map(
          stake =>
            `('${stake.address}', '${stake.txid}', ${stake.vout}, ${stake.block_height}, '${stake.block_hash}', '${stake.block_time.toISOString()}', ${stake.amount_sats}, '${stake.classifier}', '${stake.source_address}')`
        )
        .join(',');

      const query = `
        INSERT INTO staking_rewards (identity_address, txid, vout, block_height, block_hash, block_time, amount_sats, classifier, source_address)
        VALUES ${values}
        ON CONFLICT (txid, vout) DO NOTHING
      `;

      await this.pool.query(query);
      this.stakesFound += verusidStakes.length;
      return true;
    } catch (error) {
      console.error('❌ Error saving stakes:', error.message);
      return false;
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

      if (!this.isProofOfStakeBlock(blockData)) {
        return true; // Not a PoS block
      }

      this.posBlocksFound++;

      const { stakes, identityCreations } =
        await this.extractAllStakesFromBlock(blockData);

      // Save identity creations first
      if (identityCreations.length > 0) {
        await this.saveIdentityCreations(identityCreations);
      }

      // Then save stakes
      if (stakes.length > 0) {
        await this.saveStakes(stakes);

        const verusidStakes = stakes.filter(s => s.is_verusid);
        if (verusidStakes.length > 0) {
          console.log(
            `   🎯 Block ${blockHeight}: Found ${verusidStakes.length} VerusID stake(s)`
          );
          verusidStakes.forEach(stake => {
            const amount = (stake.amount_sats / 100000000).toFixed(8);
            console.log(`      💰 ${stake.address}: ${amount} VRSC`);
          });
        }
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

      const currentHeight = await this.getCurrentBlockchainHeight();
      const endBlock = Math.min(this.endBlock, currentHeight);

      console.log(
        `📊 Scanning range: ${this.startBlock.toLocaleString()} to ${endBlock.toLocaleString()}`
      );
      console.log(
        `📊 Total blocks: ${(endBlock - this.startBlock + 1).toLocaleString()}`
      );
      console.log('');

      for (
        let blockHeight = this.startBlock;
        blockHeight <= endBlock;
        blockHeight++
      ) {
        await this.processBlock(blockHeight);
        this.blocksProcessed++;

        if (this.blocksProcessed % 1000 === 0) {
          const progress = (
            (this.blocksProcessed / (endBlock - this.startBlock + 1)) *
            100
          ).toFixed(2);
          const elapsed = (Date.now() - this.startTime) / 1000;
          const rate = this.blocksProcessed / elapsed;
          const remaining = endBlock - blockHeight;
          const eta = remaining / rate;

          console.log(
            `📊 Progress: ${progress}% (Block ${blockHeight.toLocaleString()})`
          );
          console.log(`   PoS blocks: ${this.posBlocksFound}`);
          console.log(`   Stakes found: ${this.stakesFound}`);
          console.log(`   Speed: ${rate.toFixed(2)} blocks/sec`);
          console.log(`   ETA: ${(eta / 60).toFixed(1)} minutes\n`);
        }
      }

      console.log(
        '\n╔═══════════════════════════════════════════════════════════╗'
      );
      console.log(
        '║              SCAN COMPLETE!                               ║'
      );
      console.log(
        '╚═══════════════════════════════════════════════════════════╝'
      );
      console.log(
        `📊 Blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(
        `🎯 PoS blocks found: ${this.posBlocksFound.toLocaleString()}`
      );
      console.log(`💰 Stakes found: ${this.stakesFound.toLocaleString()}`);
      console.log(
        `⏱️  Time: ${((Date.now() - this.startTime) / 1000 / 60).toFixed(1)} minutes`
      );
    } catch (error) {
      console.error('❌ Scanner failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the scanner
const scanner = new YearVerusIDScanner();
scanner.run().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});
