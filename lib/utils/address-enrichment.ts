/**
 * Address Enrichment Utility
 * Maps blockchain addresses to friendly names (pools, exchanges, known stakers)
 * Inspired by Oink70's KnownStakingAddresses.sed
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export interface KnownAddress {
  address: string;
  name: string;
  type: 'pool' | 'staker' | 'exchange' | 'service' | 'other';
  description?: string;
  website?: string;
  verified: boolean;
}

// In-memory cache for known addresses (refreshed periodically)
let addressCache: Map<string, KnownAddress> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh the address cache from database
 */
async function refreshCache(): Promise<void> {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && addressCache.size > 0) {
    return; // Cache is still fresh
  }

  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM known_addresses');

    addressCache.clear();
    for (const row of result.rows) {
      addressCache.set(row.address, {
        address: row.address,
        name: row.name,
        type: row.type,
        description: row.description,
        website: row.website,
        verified: row.verified,
      });
    }

    cacheTimestamp = now;
    console.log(
      `[Address Enrichment] Cache refreshed with ${addressCache.size} known addresses`
    );
  } catch (error) {
    console.error('[Address Enrichment] Failed to refresh cache:', error);
  }
}

/**
 * Get known address info by address
 */
export async function getKnownAddress(
  address: string
): Promise<KnownAddress | null> {
  await refreshCache();
  return addressCache.get(address) || null;
}

/**
 * Get friendly name for an address (or return shortened address if unknown)
 */
export async function getAddressName(
  address: string,
  shorten = true
): Promise<string> {
  const known = await getKnownAddress(address);
  if (known) {
    return known.name;
  }

  if (shorten && address.length > 12) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return address;
}

/**
 * Enrich an address with known info (for display)
 */
export async function enrichAddress(address: string): Promise<{
  address: string;
  displayName: string;
  known: KnownAddress | null;
}> {
  const known = await getKnownAddress(address);

  return {
    address,
    displayName: known ? known.name : address,
    known,
  };
}

/**
 * Enrich multiple addresses at once (batched)
 */
export async function enrichAddresses(addresses: string[]): Promise<
  Map<
    string,
    {
      address: string;
      displayName: string;
      known: KnownAddress | null;
    }
  >
> {
  await refreshCache();

  const result = new Map();

  for (const address of addresses) {
    const known = addressCache.get(address) || null;
    result.set(address, {
      address,
      displayName: known ? known.name : address,
      known,
    });
  }

  return result;
}

/**
 * Get all known addresses by type
 */
export async function getKnownAddressesByType(
  type: string
): Promise<KnownAddress[]> {
  await refreshCache();

  return Array.from(addressCache.values()).filter(addr => addr.type === type);
}

/**
 * Get all pools
 */
export async function getKnownPools(): Promise<KnownAddress[]> {
  return getKnownAddressesByType('pool');
}

/**
 * Check if an address is a known pool
 */
export async function isKnownPool(address: string): Promise<boolean> {
  const known = await getKnownAddress(address);
  return known?.type === 'pool';
}

/**
 * Get statistics about known addresses
 */
export async function getKnownAddressStats(): Promise<{
  total: number;
  pools: number;
  stakers: number;
  exchanges: number;
  services: number;
  verified: number;
}> {
  await refreshCache();

  const addresses = Array.from(addressCache.values());

  return {
    total: addresses.length,
    pools: addresses.filter(a => a.type === 'pool').length,
    stakers: addresses.filter(a => a.type === 'staker').length,
    exchanges: addresses.filter(a => a.type === 'exchange').length,
    services: addresses.filter(a => a.type === 'service').length,
    verified: addresses.filter(a => a.verified).length,
  };
}

/**
 * Manually clear the cache (useful for testing)
 */
export function clearCache(): void {
  addressCache.clear();
  cacheTimestamp = 0;
}
