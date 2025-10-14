import { enhancedLogger } from './enhanced-logger';

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
  enhancedLogger.info('SYSTEM', `Verus RPC: ${process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843'}`);
}




