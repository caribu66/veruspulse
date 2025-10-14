import redis from './redis';

// Backwards-compatible export expected by some modules
export const redisClient = redis;

export default redisClient;
