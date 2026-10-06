import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
  redisWarned: boolean | undefined;
};

/**
 * Lazy Upstash Redis client.
 * Returns null when credentials are missing (local dev without Redis).
 */
export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) {
    return globalForRedis.redis;
  }

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!globalForRedis.redisWarned) {
      logger.warn("Redis not configured, caching disabled");
      globalForRedis.redisWarned = true;
    }
    globalForRedis.redis = null;
    return null;
  }

  globalForRedis.redis = new Redis({ url, token });
  return globalForRedis.redis;
}

export function isRedisEnabled(): boolean {
  return getRedis() !== null;
}
