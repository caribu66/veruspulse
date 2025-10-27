#!/usr/bin/env node

/**
 * Fill Missing Creation Blocks
 * Uses getidentityhistory to find creation blocks for identities
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class CreationBlockFiller {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.updated = 0;
    this.errors = 0;
  }

  async getIdentityCreation(identityAddress) {
    try {
      const result = execSync(
        `/home/explorer/verus-cli/verus getidentityhistory ${identityAddress} 0 0 2>/dev/null`,
        { encoding: 'utf8' }
      );

      const data = JSON.parse(result);

      if (data.history && data.history.length > 0) {
        // Get the FIRST entry (oldest = creation)
        const firstEntry = data.history[0];

        return {
          block_height: firstEntry.height,
          txid: firstEntry.output?.txid,
          block_hash: firstEntry.blockhash,
        };
      }

      return null;
    } catch (error) {
      // Identity might not exist or RPC error
      return null;
    }
  }

  async fillCreationBlocks() {
    try {
      // Get all identities without creation blocks
      const result = await this.pool.query(
        'SELECT identity_address, friendly_name FROM identities WHERE creation_block_height IS NULL ORDER BY identity_address'
      );

      const identities = result.rows;
      console.log(
        `Found ${identities.length} identities without creation blocks\n`
      );

      for (let i = 0; i < identities.length; i++) {
        const identity = identities[i];

        console.log(
          `[${i + 1}/${identities.length}] ${identity.friendly_name} (${identity.identity_address})`
        );

        const creation = await this.getIdentityCreation(
          identity.identity_address
        );

        if (creation) {
          // Get timestamp from block
          try {
            const blockData = execSync(
              `/home/explorer/verus-cli/verus getblock ${creation.block_hash} 2>/dev/null`,
              { encoding: 'utf8' }
            );
            const block = JSON.parse(blockData);
            const timestamp = new Date(block.time * 1000);

            await this.pool.query(
              `UPDATE identities 
               SET creation_block_height = $1, 
                   creation_txid = $2,
                   creation_timestamp = $3
               WHERE identity_address = $4`,
              [
                creation.block_height,
                creation.txid,
                timestamp,
                identity.identity_address,
              ]
            );

            this.updated++;
            console.log(
              `  ✓ Updated with block ${creation.block_height} (${timestamp.toISOString().split('T')[0]})`
            );
          } catch (error) {
            this.errors++;
            console.log(`  ✗ Error: ${error.message}`);
          }
        } else {
          this.errors++;
          console.log(`  ✗ No creation data found`);
        }

        // Small delay to avoid overloading RPC
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(
        '\n═══════════════════════════════════════════════════════════'
      );
      console.log('🎉 COMPLETE!');
      console.log(
        '═══════════════════════════════════════════════════════════'
      );
      console.log(`Updated: ${this.updated}`);
      console.log(`Errors:  ${this.errors}`);
      console.log(
        '═══════════════════════════════════════════════════════════\n'
      );
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run
const filler = new CreationBlockFiller();
filler
  .fillCreationBlocks()
  .catch(console.error)
  .finally(() => process.exit(0));
