/**
 * Startup Validation
 * Runs environment validation before application starts
 * Import this file early in your application lifecycle
 */

import { getEnv, validateEnv, getEnvSummary } from './env';

/**
 * Validates environment and logs startup information
 * Call this in your application entry point
 */
export function validateStartup(): void {
  const validation = validateEnv();

  if (!validation.valid) {
    console.error('╔════════════════════════════════════════════╗');
    console.error('║  ⚠️  STARTUP VALIDATION FAILED            ║');
    console.error('╚════════════════════════════════════════════╝');
    console.error('\n❌ Environment validation errors:');
    validation.errors?.forEach((error) => {
      console.error(`   • ${error}`);
    });
    console.error('\n💡 Fix these errors before starting the application.\n');
    process.exit(1);
  }

  // Log startup configuration (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ Environment Validation Successful     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const summary = getEnvSummary();
    console.log('📋 Configuration Summary:');
    console.log(`   Environment: ${summary.NODE_ENV}`);
    console.log(`   RPC Host: ${summary.VERUS_RPC_HOST}`);
    console.log(`   RPC User: ${summary.VERUS_RPC_USER}`);
    console.log(`   Redis: ${summary.REDIS_HOST}:${summary.REDIS_PORT}`);
    console.log(`   ZMQ Enabled: ${summary.ENABLE_ZMQ}`);
    console.log(`   Database: ${summary.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.log(`   Cache Enabled: ${summary.ENABLE_CACHE}`);
    console.log(`   Rate Limiting: ${summary.ENABLE_RATE_LIMITING}\n`);
  }
}

// Auto-run validation on import (server-side only)
if (typeof window === 'undefined') {
  try {
    validateStartup();
  } catch (error) {
    // Error already logged in validateStartup
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

