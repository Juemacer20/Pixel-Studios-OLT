const Redis = require('ioredis');

const options = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
};

const redis = new Redis(options);

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));
redis.on('reconnecting', () => console.log('Redis reconnecting...'));

module.exports = redis;
