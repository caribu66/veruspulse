import { enhancedLogger } from './enhanced-logger';
import { initializeSmartVerusIDUpdater } from '../services/smart-verusid-updater';

export function showStartupBanner() {
  console.info('\n');
  console.info('🚀 ========================================');
  console.info('   VERUS EXPLORER - ENHANCED LOGGING');
  console.info('========================================');
  console.info('📊 Real-time monitoring active');
  console.info('🔍 API calls tracked');
  console.info('💰 Staking rewards monitored');
  console.info('🔗 RPC calls logged');
  console.info('⚠️  Errors highlighted');
  console.info('📈 Performance metrics enabled');
  console.info('========================================');
  console.info('🎯 Watch this console for detailed activity');
  console.info('========================================\n');

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
