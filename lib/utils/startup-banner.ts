import { enhancedLogger } from './enhanced-logger';
import { initializeSmartVerusIDUpdater } from '../services/smart-verusid-updater';

export function showStartupBanner() {
  console.log('\n');
  console.log('🚀 ========================================');
  console.log('   VERUS EXPLORER - ENHANCED LOGGING');
  console.log('========================================');
  console.log('📊 Real-time monitoring active');
  console.log('🔍 API calls tracked');
  console.log('💰 Staking rewards monitored');
  console.log('🔗 RPC calls logged');
  console.log('⚠️  Errors highlighted');
  console.log('📈 Performance metrics enabled');
  console.log('========================================');
  console.log('🎯 Watch this console for detailed activity');
  console.log('========================================\n');

  enhancedLogger.info('SYSTEM', 'Enhanced logging system initialized');
  enhancedLogger.info('SYSTEM', `Environment: ${process.env.NODE_ENV}`);
  enhancedLogger.info(
    'SYSTEM',
    `Verus RPC: ${process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843'}`
  );

  // Initialize Smart VerusID Updater if database is available
  // Only in production or if explicitly enabled
  if (
    process.env.DATABASE_URL &&
    process.env.UTXO_DATABASE_ENABLED === 'true' &&
    (process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_SMART_UPDATER === 'true')
  ) {
    initializeSmartVerusIDUpdater(process.env.DATABASE_URL)
      .then(() => {
        enhancedLogger.info(
          'SYSTEM',
          'Smart VerusID Updater initialized successfully'
        );
      })
      .catch(error => {
        enhancedLogger.warn(
          'SYSTEM',
          'Failed to initialize Smart VerusID Updater:',
          error.message
        );
      });
  } else {
    enhancedLogger.info(
      'SYSTEM',
      'Smart VerusID Updater disabled (set ENABLE_SMART_UPDATER=true to enable in dev)'
    );
  }
}
