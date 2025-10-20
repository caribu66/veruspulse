#!/usr/bin/env node

/**
 * Quick RPC Load Checker
 * Simple one-time check of current RPC usage
 * 
 * Usage:
 *   node scripts/check-rpc-load.js
 */

async function checkRPCLoad() {
  console.log('\n🔍 Checking RPC Load...\n');

  try {
    // Check if server is running
    const response = await fetch('http://localhost:3000/api/rpc-stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch stats');
    }

    const stats = data.data;

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  RPC LOAD REPORT                      ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`${stats.status}\n`);

    // Display live statistics if available
    if (stats.live) {
      console.log('🔴 LIVE USAGE (Real-time):');
      console.log('─────────────────────────────────────────────────────');
      console.log(`  Per Second:  ${stats.live.current.perSecond.toString().padStart(3)}/${stats.live.limits.perSecond.toString().padStart(3)} requests  (${stats.live.usage.perSecond})`);
      console.log(`  Per Minute:  ${stats.live.current.perMinute.toString().padStart(3)}/${stats.live.limits.perMinute.toString().padStart(3)} requests  (${stats.live.usage.perMinute})`);
      console.log(`  Per Hour:    ${stats.live.current.perHour.toString().padStart(3)}/${stats.live.limits.perHour.toString().padStart(4)} requests (${stats.live.usage.perHour})`);
      console.log(`  Burst Tokens: ${stats.live.available.burst}/${stats.live.limits.burst} available`);
      console.log(`  Total Tracked: ${stats.live.totalTrackedRequests} requests in window`);
      console.log(`  Health: ${stats.live.isHealthy ? '✅ Healthy' : '⚠️  Approaching limits'}\n`);
    }

    console.log('📊 RATE LIMITS (Configured):');
    console.log(`  • Per Second: ${stats.rateLimits.configured.maxRequestsPerSecond} req/s`);
    console.log(`  • Per Minute: ${stats.rateLimits.configured.maxRequestsPerMinute} req/min`);
    console.log(`  • Per Hour:   ${stats.rateLimits.configured.maxRequestsPerHour} req/hr`);
    console.log(`  • Burst:      ${stats.rateLimits.configured.burstLimit} requests\n`);

    console.log('💾 CACHE CONFIGURATION:');
    Object.entries(stats.caching).forEach(([key, value]) => {
      console.log(`  • ${key.padEnd(20)} ${value}`);
    });
    console.log();

    console.log('🔄 FRONTEND POLLING:');
    Object.entries(stats.frontendPolling).forEach(([component, config]) => {
      console.log(`  ${component}:`);
      console.log(`    Interval: ${config.interval}`);
      console.log(`    Endpoint: ${config.endpoint}`);
      if (config.note) console.log(`    Note: ${config.note}`);
      if (config.cacheHitRate) console.log(`    Cache: ${config.cacheHitRate}`);
    });
    console.log();

    console.log('📈 ESTIMATED LOAD:');
    console.log(`  • Worst Case:  ${stats.estimatedLoad.perMinuteWorstCase}`);
    console.log(`  • With Cache:  ${stats.estimatedLoad.perMinuteWithCache}`);
    console.log(`  • ${stats.estimatedLoad.note}\n`);

    console.log('💡 RECOMMENDATIONS:');
    stats.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('✅ No issues detected. RPC usage is well-managed.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure your Next.js dev server is running:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
}

// Run check
checkRPCLoad();

