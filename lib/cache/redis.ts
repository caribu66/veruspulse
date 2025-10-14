import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  family: 4, // 4 (IPv4) or 6 (IPv6)
  keyPrefix: 'verus-explorer:',
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
  logger.info('🔗 Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('✅ Redis ready for operations');
});

redis.on('error', error => {
  logger.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

export default redis;
