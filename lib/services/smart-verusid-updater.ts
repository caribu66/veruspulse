/**
 * Smart VerusID Updater Service
 * Automatically updates VerusIDs when their addresses appear in new blocks
 */

import { verusAPI } from '@/lib/rpc-client-robust';
import { logger } from '@/lib/utils/logger';
import { Pool } from 'pg';

interface VerusIDAddress {
  identityAddress: string;
  primaryAddresses: string[];
  friendlyName: string;
  lastUpdated: Date;
}

export class SmartVerusIDUpdater {
  private db: Pool;
  private knownAddresses: Map<string, VerusIDAddress> = new Map();
  private lastProcessedBlock: number = 0;
  private isRunning: boolean = false;

  constructor(databaseUrl: string) {
    this.db = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Initialize the smart updater
   */
  async initialize(): Promise<void> {
    try {
      // Load known VerusID addresses from database
      await this.loadKnownAddresses();

      // Get current blockchain height
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      this.lastProcessedBlock = blockchainInfo.blocks;

      logger.info(
        `Smart VerusID Updater initialized. Tracking ${this.knownAddresses.size} addresses from block ${this.lastProcessedBlock}`
      );
    } catch (error) {
      logger.error('Failed to initialize Smart VerusID Updater:', error);
      throw error;
    }
  }

  /**
   * Load known VerusID addresses from database
   */
  private async loadKnownAddresses(): Promise<void> {
    try {
      const query = `
        SELECT 
          identity_address,
          primary_addresses,
          friendly_name,
          updated_at
        FROM verusid_statistics 
        WHERE primary_addresses IS NOT NULL 
        AND primary_addresses != '[]'
        AND primary_addresses != 'null'
      `;

      const result = await this.db.query(query);

      for (const row of result.rows) {
        try {
          const primaryAddresses = JSON.parse(row.primary_addresses || '[]');
          if (Array.isArray(primaryAddresses) && primaryAddresses.length > 0) {
            this.knownAddresses.set(row.identity_address, {
              identityAddress: row.identity_address,
              primaryAddresses,
              friendlyName: row.friendly_name || row.identity_address,
              lastUpdated: new Date(row.updated_at),
            });
          }
        } catch (parseError) {
          logger.warn(
            `Failed to parse primary addresses for ${row.identity_address}:`,
            parseError
          );
        }
      }

      logger.info(
        `Loaded ${this.knownAddresses.size} VerusIDs with primary addresses`
      );
    } catch (error) {
      logger.error('Failed to load known addresses:', error);
      throw error;
    }
  }

  /**
   * Process new blocks and update relevant VerusIDs
   */
  async processNewBlocks(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Smart updater already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Get current blockchain height
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;

      if (currentHeight <= this.lastProcessedBlock) {
        logger.debug('No new blocks to process');
        return;
      }

      logger.info(
        `Processing blocks ${this.lastProcessedBlock + 1} to ${currentHeight}`
      );

      // Process each new block
      for (
        let height = this.lastProcessedBlock + 1;
        height <= currentHeight;
        height++
      ) {
        await this.processBlock(height);
      }

      this.lastProcessedBlock = currentHeight;
      logger.info(
        `Processed ${currentHeight - this.lastProcessedBlock} new blocks`
      );
    } catch (error) {
      logger.error('Error processing new blocks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single block for VerusID updates
   */
  private async processBlock(height: number): Promise<void> {
    try {
      // Get block hash
      const blockHash = await verusAPI.getBlockHash(height);

      // Get block data
      const block = await verusAPI.getBlock(blockHash, 2);

      if (!block || !block.tx) {
        return;
      }

      // Check if this is a PoS block (minted)
      if (block.blocktype === 'minted') {
        await this.processStakeBlock(block);
      }

      // Check all transactions for address activity
      const addressesToUpdate = new Set<string>();

      for (const tx of block.tx) {
        // Check inputs
        if (tx.vin) {
          for (const input of tx.vin) {
            if (input.txid && input.vout !== undefined) {
              const address = await this.getAddressFromInput(input);
              if (address && this.isKnownAddress(address)) {
                addressesToUpdate.add(this.getIdentityAddress(address));
              }
            }
          }
        }

        // Check outputs
        if (tx.vout) {
          for (const output of tx.vout) {
            if (output.scriptPubKey?.addresses) {
              for (const address of output.scriptPubKey.addresses) {
                if (this.isKnownAddress(address)) {
                  addressesToUpdate.add(this.getIdentityAddress(address));
                }
              }
            }
          }
        }
      }

      // Update affected VerusIDs
      if (addressesToUpdate.size > 0) {
        logger.info(
          `Block ${height}: Found activity for ${addressesToUpdate.size} VerusIDs`
        );
        await this.updateVerusIDs(Array.from(addressesToUpdate));
      }
    } catch (error) {
      logger.error(`Error processing block ${height}:`, error);
    }
  }

  /**
   * Process a stake block (PoS block)
   */
  private async processStakeBlock(block: any): Promise<void> {
    try {
      if (!block.tx || block.tx.length === 0) {
        return;
      }

      // The first transaction in a PoS block is the coinstake
      const coinstakeTx = block.tx[0];

      if (coinstakeTx.vout) {
        for (const output of coinstakeTx.vout) {
          if (output.scriptPubKey?.addresses) {
            for (const address of output.scriptPubKey.addresses) {
              if (this.isKnownAddress(address)) {
                const identityAddress = this.getIdentityAddress(address);
                logger.info(
                  `Stake reward detected for ${identityAddress} in block ${block.height}`
                );

                // Immediately update this VerusID
                await this.updateVerusIDs([identityAddress]);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing stake block:', error);
    }
  }

  /**
   * Get address from transaction input
   */
  private async getAddressFromInput(input: any): Promise<string | null> {
    try {
      if (!input.txid || input.vout === undefined) {
        return null;
      }

      const prevTx = await verusAPI.getRawTransaction(input.txid, true);
      if (prevTx?.vout?.[input.vout]?.scriptPubKey?.addresses) {
        return prevTx.vout[input.vout].scriptPubKey.addresses[0];
      }

      return null;
    } catch (error) {
      // Ignore errors for individual inputs
      return null;
    }
  }

  /**
   * Check if address is known (belongs to a tracked VerusID)
   */
  private isKnownAddress(address: string): boolean {
    const addresses = Array.from(this.knownAddresses.values());
    return addresses.some(verusID =>
      verusID.primaryAddresses.includes(address)
    );
  }

  /**
   * Get identity address for a given primary address
   */
  private getIdentityAddress(primaryAddress: string): string {
    const entries = Array.from(this.knownAddresses.entries());
    const found = entries.find(([_, verusID]) =>
      verusID.primaryAddresses.includes(primaryAddress)
    );
    return found ? found[0] : '';
  }

  /**
   * Update specific VerusIDs
   */
  private async updateVerusIDs(identityAddresses: string[]): Promise<void> {
    try {
      for (const identityAddress of identityAddresses) {
        // Mark for immediate update in database
        await this.db.query(
          "UPDATE verusid_statistics SET last_calculated = NOW() - INTERVAL '7 hours' WHERE identity_address = $1",
          [identityAddress]
        );

        logger.info(`Marked ${identityAddress} for immediate update`);
      }
    } catch (error) {
      logger.error('Error updating VerusIDs:', error);
    }
  }

  /**
   * Start the smart updater (runs every 30 seconds)
   */
  start(): void {
    logger.info('Starting Smart VerusID Updater...');

    // Process new blocks every 30 seconds
    setInterval(async () => {
      try {
        await this.processNewBlocks();
      } catch (error) {
        logger.error('Smart updater interval error:', error);
      }
    }, 30000);

    logger.info('Smart VerusID Updater started');
  }

  /**
   * Get status information
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      knownAddresses: this.knownAddresses.size,
      lastProcessedBlock: this.lastProcessedBlock,
      addresses: Array.from(this.knownAddresses.keys()),
    };
  }
}

// Export singleton instance
let smartUpdater: SmartVerusIDUpdater | null = null;

export function getSmartVerusIDUpdater(): SmartVerusIDUpdater | null {
  return smartUpdater;
}

export async function initializeSmartVerusIDUpdater(
  databaseUrl: string
): Promise<SmartVerusIDUpdater> {
  if (!smartUpdater) {
    smartUpdater = new SmartVerusIDUpdater(databaseUrl);
    await smartUpdater.initialize();
    smartUpdater.start();
  }
  return smartUpdater;
}
