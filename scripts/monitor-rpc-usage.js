#!/usr/bin/env node

/**
 * RPC Usage Monitor (Live)
 * Connects to the running Next.js server and displays real-time RPC statistics
 * 
 * Usage:
 *   node scripts/monitor-rpc-usage.js
 *   OR
 *   npm run rpc:monitor
 * 
 * Features:
 * - Real-time request tracking from live application
 * - Visual progress bars showing usage vs. limits
 * - Color-coded status indicators
 * - Auto-refreshing display
 */

const STATS_INTERVAL = 5000; // Update stats every 5 seconds
const API_URL = 'http://localhost:3000/api/rpc-stats';

class RPCMonitor {
  constructor() {
    this.rateLimits = {
      perSecond: 10,
      perMinute: 300,
      perHour: 10000,
    };
  }

  // Fetch live stats from API
  async fetchLiveStats() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.success || !data.data.live) return null;
      
      return data.data.live;
    } catch (error) {
      return null;
    }
  }

  // Display a progress bar
  displayBar(label, current, max, percentage) {
    const barLength = 30;
    const filled = Math.floor((percentage / 100) * barLength);
    const empty = barLength - filled;
    
    let color = '\x1b[32m'; // Green
    if (percentage >= 90) color = '\x1b[31m'; // Red
    else if (percentage >= 75) color = '\x1b[33m'; // Yellow
    else if (percentage >= 50) color = '\x1b[93m'; // Light yellow
    
    const bar = color + '█'.repeat(filled) + '\x1b[90m' + '░'.repeat(empty) + '\x1b[0m';
    const percentStr = percentage.toFixed(1).padStart(5) + '%';
    const countStr = `${current}/${max}`.padStart(12);
    
    console.log(`${label.padEnd(11)} [${bar}] ${percentStr} ${countStr}`);
  }

  // Display live stats from API
  async displayLiveStats() {
    const liveStats = await this.fetchLiveStats();
    
    if (!liveStats) {
      console.log('⚠️  Lost connection to API server...');
      return;
    }

    // Parse usage percentages
    const usage = {
      perSecond: parseFloat(liveStats.usage.perSecond),
      perMinute: parseFloat(liveStats.usage.perMinute),
      perHour: parseFloat(liveStats.usage.perHour),
    };

    const maxUsage = Math.max(usage.perSecond, usage.perMinute, usage.perHour);

    let statusEmoji = '🟢';
    let statusText = 'HEALTHY';
    let statusColor = '\x1b[32m';

    if (maxUsage >= 90) {
      statusEmoji = '🔴';
      statusText = 'CRITICAL';
      statusColor = '\x1b[31m';
    } else if (maxUsage >= 75) {
      statusEmoji = '🟠';
      statusText = 'WARNING';
      statusColor = '\x1b[33m';
    } else if (maxUsage >= 50) {
      statusEmoji = '🟡';
      statusText = 'MODERATE';
      statusColor = '\x1b[93m';
    }
    
    // Clear console
    console.clear();
    
    // Header
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║        VERUS RPC USAGE MONITOR (LIVE)              ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // Status
    console.log(`${statusColor}Status: ${statusEmoji} ${statusText}\x1b[0m`);
    console.log(`Tracking: ${liveStats.totalTrackedRequests} requests in current window\n`);
    
    // Current rates
    console.log('📊 CURRENT RATES (Real-time from server):');
    console.log('─────────────────────────────────────────────────────');
    this.displayBar('Per Second', liveStats.current.perSecond, liveStats.limits.perSecond, usage.perSecond);
    this.displayBar('Per Minute', liveStats.current.perMinute, liveStats.limits.perMinute, usage.perMinute);
    this.displayBar('Per Hour', liveStats.current.perHour, liveStats.limits.perHour, usage.perHour);
    
    // Available capacity
    console.log('\n💨 AVAILABLE CAPACITY:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`  Per Second:  ${liveStats.available.perSecond} requests available`);
    console.log(`  Per Minute:  ${liveStats.available.perMinute} requests available`);
    console.log(`  Per Hour:    ${liveStats.available.perHour} requests available`);
    console.log(`  Burst Tokens: ${liveStats.available.burst}/${liveStats.limits.burst} tokens`);
    
    // Health status
    console.log('\n💡 STATUS:');
    console.log('─────────────────────────────────────────────────────');
    if (liveStats.isHealthy) {
      console.log('  ✅ RPC usage is healthy');
      console.log('  ✅ All limits well within safe ranges');
    } else {
      console.log('  ⚠️  Approaching rate limits');
      console.log('  ⚠️  Consider reviewing high-frequency operations');
    }
    
    // Warnings
    if (usage.perSecond >= 75 || usage.perMinute >= 75 || usage.perHour >= 75) {
      console.log('\n⚠️  WARNINGS:');
      console.log('─────────────────────────────────────────────────────');
      if (usage.perSecond >= 75) {
        console.log('  • Approaching per-second rate limit!');
      }
      if (usage.perMinute >= 75) {
        console.log('  • Approaching per-minute rate limit!');
      }
      if (usage.perHour >= 75) {
        console.log('  • Approaching per-hour rate limit!');
      }
    }
    
    console.log('\n─────────────────────────────────────────────────────');
    console.log(`Updates every ${STATS_INTERVAL/1000}s | Press Ctrl+C to exit\n`);
  }

  // Start monitoring
  async start() {
    console.log('🚀 Starting RPC Monitor...\n');
    console.log('📡 Connecting to live API endpoint...\n');
    
    // Check if API is available
    const initialStats = await this.fetchLiveStats();
    if (!initialStats) {
      console.error('❌ Error: Cannot connect to http://localhost:3000');
      console.error('   Make sure your Next.js dev server is running:');
      console.error('   npm run dev\n');
      process.exit(1);
    }

    console.log('✅ Connected! Monitoring live RPC usage...\n');
    
    // Small delay before first display
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Display initial stats
    await this.displayLiveStats();
    
    // Update display periodically
    setInterval(async () => {
      await this.displayLiveStats();
    }, STATS_INTERVAL);
  }
}

// Run monitor
const monitor = new RPCMonitor();
monitor.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down RPC monitor...');
  process.exit(0);
});
