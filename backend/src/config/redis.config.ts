// Helper to parse REDIS_URL and get Redis connection options
// Supports both REDIS_URL format and individual environment variables

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

export const getRedisConfig = (): RedisConfig => {
  // Support REDIS_URL format (redis://:password@host:port or redis://host:port)
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
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

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};


