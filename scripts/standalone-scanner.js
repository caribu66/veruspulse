#!/usr/bin/env node
/**
 * Standalone Scanner - Run without Next.js server
 * This is a direct Node.js script that runs the scanner independently
 */

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('================================================');
console.log('  Standalone Mass Scanner');
console.log('================================================');
console.log('');

// Check database connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('✅ Database URL configured');
console.log('');

// Initialize database pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('🔌 Testing database connection...');

db.query('SELECT current_database(), current_user')
  .then(result => {
    console.log(`✅ Connected to database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log('');
    
    return startScanner();
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });

async function startScanner() {
  console.log('📦 Loading scanner modules...');
  
  // Dynamic import for ES modules
  const { IntelligentMassScanner } = await import('../lib/services/intelligent-mass-scanner.js');
  
  console.log('✅ Scanner loaded');
  console.log('');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const scanType = args[0] || 'full';
  const limitAddresses = parseInt(args[1]) || 10000;
  const days = parseInt(args[2]) || 30;
  
  console.log('📋 Configuration:');
  console.log(`   Scan Type: ${scanType}`);
  console.log(`   Address Limit: ${limitAddresses}`);
  if (scanType === 'recent') {
    console.log(`   Days: ${days}`);
  }
  console.log('');
  
  // Configure scanner based on type
  let config;
  let options = { limitAddresses };
  
  if (scanType === 'full' || scanType === 'full-history') {
    console.log('🔄 Starting FULL HISTORY scan...');
    config = {
      maxConcurrentRequests: 2,
      delayBetweenBatches: 200,
      blockBatchSize: 25,
      addressBatchSize: 5,
      cacheBlockData: true,
      maxRetries: 5,
      backoffMultiplier: 3,
    };
  } else if (scanType === 'recent') {
    console.log(`🔄 Starting RECENT scan (${days} days)...`);
    
    // Calculate block range
    const { verusAPI } = await import('../lib/rpc-client-robust.js');
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    const blocksToScan = days * 1440; // ~1440 blocks per day
    const startHeight = Math.max(1, currentHeight - blocksToScan);
    
    options.startFromHeight = startHeight;
    options.endAtHeight = currentHeight;
    
    config = {
      maxConcurrentRequests: 5,
      delayBetweenBatches: 50,
      blockBatchSize: 100,
      addressBatchSize: 20,
      cacheBlockData: true,
      maxRetries: 3,
      backoffMultiplier: 2,
    };
  } else {
    console.error('❌ Invalid scan type. Use: full, recent');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/standalone-scanner.js full [limitAddresses]');
    console.log('  node scripts/standalone-scanner.js recent [limitAddresses] [days]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/standalone-scanner.js full 10000');
    console.log('  node scripts/standalone-scanner.js recent 10000 30');
    process.exit(1);
  }
  
  console.log('⚙️  Scanner Configuration:');
  console.log(`   Max Concurrent: ${config.maxConcurrentRequests}`);
  console.log(`   Batch Delay: ${config.delayBetweenBatches}ms`);
  console.log(`   Block Batch Size: ${config.blockBatchSize}`);
  console.log('');
  
  // Initialize scanner
  const scanner = new IntelligentMassScanner(db, config);
  
  // Progress monitoring
  const progressInterval = setInterval(() => {
    const progress = scanner.getProgress();
    
    if (!scanner.isScanning()) {
      clearInterval(progressInterval);
      return;
    }
    
    const blockPercent = progress.totalBlocks > 0 ?
      ((progress.blocksProcessed / progress.totalBlocks) * 100).toFixed(2) : 0;
    
    const elapsed = Date.now() - progress.startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    console.log(`[${hours}h ${minutes}m ${seconds}s] Phase: ${progress.currentPhase} | Blocks: ${progress.blocksProcessed}/${progress.totalBlocks} (${blockPercent}%) | Stakes: ${progress.stakeEventsFound} | Errors: ${progress.errors}`);
  }, 10000); // Update every 10 seconds
  
  console.log('🚀 Scanner started!');
  console.log('   Press Ctrl+C to stop gracefully');
  console.log('');
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('');
    console.log('⏸️  Stopping scanner gracefully...');
    scanner.stopScan();
    clearInterval(progressInterval);
    
    setTimeout(() => {
      console.log('✅ Scanner stopped');
      process.exit(0);
    }, 2000);
  });
  
  // Start the scan
  try {
    await scanner.scanAllVerusIDs(options);
    
    clearInterval(progressInterval);
    
    const progress = scanner.getProgress();
    console.log('');
    console.log('================================================');
    console.log('  Scan Complete!');
    console.log('================================================');
    console.log(`   Addresses Processed: ${progress.addressesProcessed}`);
    console.log(`   Blocks Processed: ${progress.blocksProcessed}`);
    console.log(`   Stake Events Found: ${progress.stakeEventsFound}`);
    console.log(`   Errors: ${progress.errors}`);
    console.log(`   Cache Efficiency: ${((progress.cacheHits / (progress.cacheHits + progress.cacheMisses)) * 100).toFixed(2)}%`);
    console.log('');
    
    await db.end();
    process.exit(0);
  } catch (error) {
    clearInterval(progressInterval);
    console.error('');
    console.error('❌ Scanner failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

