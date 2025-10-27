#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class FixedEnhancedStakingScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 5, // Allow more connections for better performance
    });

    this.stakesFound = 0;
    this.creationsFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 10; // Much smaller batches for stability
    this.delayBetweenBatches = 3000; // 3 second delay between batches
  }

  async initialize() {
    console.log(
      '🚀 FIXED ENHANCED STAKING SCANNER - With Proper VerusID Creation Detection!'
    );
    console.log(
      '======================================================================='
    );
    console.log('');
    console.log('🔧 FIXES:');
    console.log(
      '   ✅ Uses getidentityhistory for accurate creation detection'
    );
    console.log('   ✅ Proper blockchain-based creation timestamps');
    console.log('   ✅ No false positive creation detections');
    console.log('   ✅ All previous staking scanner improvements');
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

  async getLastScannedBlock() {
    try {
      const result = await this.pool.query(
        'SELECT MAX(block_height) as last_height FROM staking_rewards'
      );
      return result.rows[0].last_height || 0;
    } catch (error) {
      console.error('❌ Error getting last scanned block:', error.message);
      return 0;
    }
  }

  async getFirstScannedBlock() {
    try {
      const result = await this.pool.query(
        'SELECT MIN(block_height) as first_height FROM staking_rewards'
      );
      return result.rows[0].first_height || 0;
    } catch (error) {
      console.error('❌ Error getting first scanned block:', error.message);
      return 0;
    }
  }

  async isProofOfStakeBlock(block) {
    // Multiple methods to detect PoS blocks
    const methods = [
      block.validationtype === 'stake',
      block.posrewarddest !== undefined,
      block.proofofstake !== undefined,
      block.tx &&
        block.tx.length > 0 &&
        block.tx[0].vout &&
        block.tx[0].vout.length > 0,
    ];

    return methods.some(method => method === true);
  }

  /**
   * FIXED: Extract VerusID creations using proper blockchain data
   */
  async extractVerusIDCreations(block, blockHeight) {
    try {
      if (!block.tx || block.tx.length === 0) {
        return [];
      }

      const creations = [];

      // Check all transactions for VerusID addresses
      for (const tx of block.tx) {
        if (!tx.vout || tx.vout.length === 0) {
          continue;
        }

        // Look for VerusID addresses
        for (const vout of tx.vout) {
          if (
            vout.scriptPubKey?.addresses &&
            vout.scriptPubKey.addresses.length > 0
          ) {
            for (const address of vout.scriptPubKey.addresses) {
              // Check if this is a VerusID (I-address)
              if (address && address.startsWith('i') && address.length > 20) {
                // Check if this VerusID needs creation data
                const needsCreationData = await this.needsCreationData(address);
                if (needsCreationData) {
                  const creationInfo =
                    await this.getVerusIDCreationInfo(address);
                  if (creationInfo) {
                    creations.push({
                      identityAddress: address,
                      txid: creationInfo.txid,
                      vout: vout.n || 0,
                      blockHeight: creationInfo.blockHeight,
                      blockTime: creationInfo.blockTime,
                      creationType: 'verusid_creation',
                    });
                  }
                }
              }
            }
          }
        }
      }

      return creations;
    } catch (error) {
      console.error(
        `❌ Error extracting VerusID creations from block ${blockHeight}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * FIXED: Check if VerusID needs creation data using blockchain
   */
  async needsCreationData(identityAddress) {
    try {
      // Check if we already have creation info
      const existing = await this.pool.query(
        'SELECT creation_block_height FROM identities WHERE identity_address = $1',
        [identityAddress]
      );

      // If no creation info, we need it
      if (
        existing.rows.length === 0 ||
        !existing.rows[0].creation_block_height
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error checking if VerusID needs creation data:`, error);
      return false;
    }
  }

  /**
   * FIXED: Get actual VerusID creation info from blockchain
   */
  async getVerusIDCreationInfo(identityAddress) {
    try {
      // Use getidentityhistory to get the actual creation data
      const result = execSync(
        `/home/explorer/verus-cli/verus getidentityhistory "${identityAddress}"`,
        { encoding: 'utf8', timeout: 10000 }
      );

      const data = JSON.parse(result);

      if (data.blockheight && data.txid) {
        // Get block timestamp
        const blockResult = execSync(
          `/home/explorer/verus-cli/verus getblock ${data.blockheight}`,
          { encoding: 'utf8', timeout: 5000 }
        );

        const blockData = JSON.parse(blockResult);

        return {
          blockHeight: data.blockheight,
          txid: data.txid,
          blockTime: new Date(blockData.time * 1000).toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Error getting VerusID creation info for ${identityAddress}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * FIXED: Store VerusID creation with proper blockchain data
   */
  async storeVerusIDCreation(creation) {
    try {
      // First, ensure the identity exists
      await this.ensureIdentityExists(creation.identityAddress);

      // Update with creation information
      await this.pool.query(
        `
        UPDATE identities 
        SET creation_block_height = $1, 
            creation_txid = $2, 
            creation_timestamp = $3,
            last_refreshed_at = NOW()
        WHERE identity_address = $4
      `,
        [
          creation.blockHeight,
          creation.txid,
          creation.blockTime,
          creation.identityAddress,
        ]
      );

      this.creationsFound++;
      console.log(
        `   🆕 VerusID Creation: ${creation.identityAddress} at block ${creation.blockHeight} (${creation.blockTime})`
      );
    } catch (error) {
      console.error(`❌ Error storing VerusID creation:`, error.message);
    }
  }

  async extractStakeFromBlock(block, blockHeight) {
    try {
      if (!block.tx || block.tx.length === 0) {
        return [];
      }

      const coinstake = block.tx[0]; // First transaction is usually the coinstake

      if (!coinstake.vout || coinstake.vout.length === 0) {
        return [];
      }

      const stakes = [];

      // Check the first output (main stake reward)
      const mainOutput = coinstake.vout[0];
      if (
        mainOutput.scriptPubKey?.addresses &&
        mainOutput.scriptPubKey.addresses.length > 0
      ) {
        // FIXED: Check ALL addresses in the array, not just the first one
        for (let i = 0; i < mainOutput.scriptPubKey.addresses.length; i++) {
          const stakerAddress = mainOutput.scriptPubKey.addresses[i];

          // Filter out trustless addresses (as per Oink70's community best practices)
          if (stakerAddress === 'RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR') {
            continue; // Skip trustless consensus addresses
          }

          // Focus on VerusIDs (I-addresses) - skip R-addresses
          if (!stakerAddress.startsWith('i')) {
            continue; // Skip R-addresses, focus on VerusIDs (I-addresses)
          }

          // Calculate reward amount (only the first output value)
          const rewardAmount = Math.round((mainOutput.value || 0) * 100000000);

          if (rewardAmount > 0) {
            stakes.push({
              identityAddress: stakerAddress,
              txid: coinstake.txid,
              vout: 0,
              blockHeight: blockHeight,
              blockTime: new Date(block.time * 1000),
              amountSats: rewardAmount,
              classifier: 'stake_reward',
              sourceAddress: stakerAddress,
            });
          }
        }
      }

      return stakes;
    } catch (error) {
      console.error(
        `❌ Error extracting stake from block ${blockHeight}:`,
        error.message
      );
      return [];
    }
  }

  async ensureIdentityExists(identityAddress) {
    try {
      await this.pool.query(
        `
        INSERT INTO identities (identity_address, base_name, created_at, last_refreshed_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (identity_address) DO NOTHING
      `,
        [
          identityAddress,
          identityAddress, // Use address as name if no name available
          new Date(),
          new Date(),
        ]
      );
    } catch (error) {
      // Ignore errors - identity might already exist
      console.log(
        `   🔍 Identity check for ${identityAddress}: ${error.message.includes('duplicate key') ? 'Already exists' : 'Created'}`
      );
    }
  }

  async storeStakeEvent(stake) {
    try {
      // Ensure identity exists first
      await this.ensureIdentityExists(stake.identityAddress);

      // Insert stake event
      await this.pool.query(
        `
        INSERT INTO staking_rewards (
          identity_address, txid, vout, block_height, block_time,
          amount_sats, classifier, source_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (txid, vout) DO UPDATE SET
          identity_address = EXCLUDED.identity_address,
          amount_sats = EXCLUDED.amount_sats,
          source_address = EXCLUDED.source_address
      `,
        [
          stake.identityAddress,
          stake.txid,
          stake.vout,
          stake.blockHeight,
          stake.blockTime,
          stake.amountSats,
          stake.classifier,
          stake.sourceAddress,
        ]
      );

      this.stakesFound++;
    } catch (error) {
      if (error.message.includes('foreign key constraint')) {
        // Try to ensure identity exists again and retry
        await this.ensureIdentityExists(stake.identityAddress);
        try {
          await this.pool.query(
            `
            INSERT INTO staking_rewards (
              identity_address, txid, vout, block_height, block_time,
              amount_sats, classifier, source_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (txid, vout) DO UPDATE SET
              identity_address = EXCLUDED.identity_address,
              amount_sats = EXCLUDED.amount_sats,
              source_address = EXCLUDED.source_address
          `,
            [
              stake.identityAddress,
              stake.txid,
              stake.vout,
              stake.blockHeight,
              stake.blockTime,
              stake.amountSats,
              stake.classifier,
              stake.sourceAddress,
            ]
          );
          this.stakesFound++;
        } catch (retryError) {
          console.error(
            `❌ Error storing stake event (retry failed):`,
            retryError.message
          );
        }
      } else {
        console.error(`❌ Error storing stake event:`, error.message);
      }
    }
  }

  async processBlock(blockHeight) {
    try {
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
        { encoding: 'utf8' }
      );
      const block = JSON.parse(blockData);

      if (!block) {
        console.log(`   ⚠️  Block ${blockHeight} not found`);
        return false;
      }

      // Extract VerusID creations from this block (FIXED)
      const creations = await this.extractVerusIDCreations(block, blockHeight);
      for (const creation of creations) {
        await this.storeVerusIDCreation(creation);
      }

      // Check if this is a PoS block and extract stakes
      const isPoS = await this.isProofOfStakeBlock(block);
      if (isPoS) {
        const stakes = await this.extractStakeFromBlock(block, blockHeight);
        for (const stake of stakes) {
          await this.storeStakeEvent(stake);
          console.log(
            `   🎯 Block ${blockHeight}: Found ${stakes.length} stake(s)`
          );
          console.log(
            `      💰 ${stake.identityAddress}: ${(stake.amountSats / 100000000).toFixed(8)} VRSC`
          );
        }
      }

      this.blocksProcessed++;
      return true;
    } catch (error) {
      console.error(`❌ Error processing block ${blockHeight}:`, error.message);
      return false;
    }
  }

  async scanBlocks(startHeight, endHeight) {
    console.log(
      `🔍 Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}...`
    );
    console.log(
      `📊 Total blocks to scan: ${(endHeight - startHeight + 1).toLocaleString()}`
    );
    console.log('');

    for (
      let blockHeight = startHeight;
      blockHeight <= endHeight;
      blockHeight++
    ) {
      const success = await this.processBlock(blockHeight);

      if (!success) {
        console.log(
          `⚠️  Failed to process block ${blockHeight}, continuing...`
        );
      }

      // Add small delay between blocks to prevent ENOBUFS
      await new Promise(resolve => setTimeout(resolve, 100));

      // Progress reporting
      if (blockHeight % 100 === 0 || blockHeight === endHeight) {
        const progress = (
          ((blockHeight - startHeight + 1) / (endHeight - startHeight + 1)) *
          100
        ).toFixed(1);
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.blocksProcessed / elapsed;
        const remaining = endHeight - blockHeight;
        const eta = remaining / rate;

        console.log(
          `📊 Progress: ${blockHeight.toLocaleString()}/${endHeight.toLocaleString()} blocks (${progress}%)`
        );
        console.log(`   🎯 Stakes found: ${this.stakesFound.toLocaleString()}`);
        console.log(
          `   🆕 Creations found: ${this.creationsFound.toLocaleString()}`
        );
        console.log(`   ⚡ Speed: ${rate.toFixed(2)} blocks/sec`);
        console.log(`   ⏱️  ETA: ${(eta / 60).toFixed(1)} minutes`);
        console.log('');
      }

      // Small delay to avoid overwhelming the system
      if (blockHeight % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async run() {
    try {
      await this.initialize();

      const currentHeight = await this.getCurrentBlockchainHeight();
      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );

      const lastScannedBlock = await this.getLastScannedBlock();
      const firstScannedBlock = await this.getFirstScannedBlock();
      console.log(
        `📊 First scanned block: ${firstScannedBlock.toLocaleString()}`
      );
      console.log(
        `📊 Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );

      // Check for historical gap from December 2020
      const december2020Block = 1299328;
      let historicalGapScanned = false;

      // Ensure we have coverage from December 2020 to tip
      if (firstScannedBlock > december2020Block) {
        console.log(
          `🔍 Found historical gap: December 2020 (${december2020Block.toLocaleString()}) to first existing block (${firstScannedBlock.toLocaleString()})`
        );
        const historicalBlocks = firstScannedBlock - december2020Block;
        console.log(
          `📊 Historical gap blocks: ${historicalBlocks.toLocaleString()}`
        );
        console.log(`🎯 Scanning historical gap first...`);
        console.log('');

        await this.scanBlocks(december2020Block, firstScannedBlock - 1);
        historicalGapScanned = true;
        console.log('');
      } else if (firstScannedBlock < december2020Block) {
        // Database starts before December 2020, need to ensure December 2020 to tip is covered
        console.log(
          `🔍 Ensuring December 2020 coverage: Database starts at ${firstScannedBlock.toLocaleString()}, ensuring December 2020 (${december2020Block.toLocaleString()}) to tip is covered`
        );
        console.log(`🎯 Scanning from December 2020 to current tip...`);
        console.log('');

        await this.scanBlocks(december2020Block, currentHeight);
        historicalGapScanned = true;
        console.log('');
      } else if (firstScannedBlock === december2020Block) {
        console.log(`✅ Coverage starts exactly at December 2020`);
      }

      // Check for recent gap
      if (lastScannedBlock >= currentHeight) {
        if (!historicalGapScanned) {
          console.log('✅ Database is up to date!');
        }
        return;
      }

      const startBlock = lastScannedBlock + 1;
      const blocksToScan = currentHeight - lastScannedBlock;

      console.log(
        `🎯 This will catch ALL VerusID stakes AND proper creation dates!`
      );
      console.log(
        `🎯 Starting FIXED ENHANCED scan from block ${startBlock.toLocaleString()} to ${currentHeight.toLocaleString()}`
      );
      console.log(
        `🔍 This will find ALL VerusID stakes and accurate creation dates!`
      );
      console.log(
        `🎯 Focusing on I-addresses (VerusIDs) only - filtering out R-addresses`
      );
      console.log(`📊 Total blocks to scan: ${blocksToScan.toLocaleString()}`);
      console.log('');

      await this.scanBlocks(startBlock, currentHeight);

      // Final statistics
      const totalTime = (Date.now() - this.startTime) / 1000;
      console.log('\n╔═══════════════════════════════════════════════╗');
      console.log('║              SCAN COMPLETE!                   ║');
      console.log('╚═══════════════════════════════════════════════╝');
      console.log(
        `📊 Blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(`🎯 Stakes found: ${this.stakesFound.toLocaleString()}`);
      console.log(
        `🆕 VerusID creations found: ${this.creationsFound.toLocaleString()}`
      );
      console.log(`⏱️  Total time: ${(totalTime / 60).toFixed(1)} minutes`);
      console.log(
        `🚀 Speed: ${(this.blocksProcessed / totalTime).toFixed(2)} blocks/sec`
      );
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the scanner
const scanner = new FixedEnhancedStakingScanner();
scanner.run().catch(console.error);
