/**
 * Redis configuration utility
 * Supports Redis connection string or individual environment variables
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: false;
  retryStrategy?: (times: number) => number;
  reconnectOnError?: (err: Error) => boolean;
}

/**
 * Parse Redis connection string
 * Format: redis://[username]:[password]@[host]:[port]
 */
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  try {
    const parsed = new URL(url);
    // For Redis Labs, username is usually 'default' and password is the auth token
    // Bull uses password for authentication
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
    };
  } catch (error) {
    throw new Error(`Invalid Redis URL: ${url}`);
  }
}

/**
 * Get Redis configuration from environment variables or connection string
 */
export function getRedisConfig(): RedisConfig {
  // Check for Redis connection string (highest priority)
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
  
  if (redisUrl) {
    const parsed = parseRedisUrl(redisUrl);
    return {
      host: parsed.host,
      port: parsed.port,
      password: parsed.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

