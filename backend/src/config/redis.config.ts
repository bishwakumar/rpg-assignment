// Helper to parse REDIS_URL and get Redis connection options
// Supports both REDIS_URL format and individual environment variables

// Default remote Redis URL (hard-coded fallback)
// NOTE: Environment variables (REDIS_URL) still take precedence over this.
const DEFAULT_REDIS_URL =
  'redis://default:AX0zAAIncDI3MDhjNWNhMGI2YTQ0NTkyOTU4YzIzNjI1MzRjNjUzNnAyMzIwNTE@set-octopus-32051.upstash.io:6379';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

export const getRedisConfig = (): RedisConfig => {
  // Use env first, otherwise fall back to the hard-coded URL
  const redisUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        // Enable TLS automatically for providers that require it (e.g., Upstash)
        tls:
          process.env.REDIS_TLS === 'true' ||
          url.protocol === 'rediss:' ||
          /upstash\.io/i.test(url.hostname),
      };
    } catch (error) {
      console.warn('Failed to parse REDIS_URL, falling back to individual variables:', error);
    }
  }

  // Local override fallback (only used if both env + default URL fail)
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};