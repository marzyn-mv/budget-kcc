import { Redis } from "@upstash/redis";
import logger from "@/lib/logger";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/**
 * Get a cached value or fetch it from the provided function.
 * Falls back to the fetcher if Redis is unavailable.
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      logger.info("Cache hit", { key });
      return cached;
    }
  } catch (error) {
    logger.warn("Cache read failed, falling back to DB", { key, error });
  }

  const data = await fetcher();

  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    logger.info("Cache set", { key, ttl: ttlSeconds });
  } catch (error) {
    logger.warn("Cache write failed", { key, error });
  }

  return data;
}

/**
 * Invalidate cache keys matching the given prefix patterns.
 * Each pattern is used as a prefix glob (e.g. "budget:*").
 */
export async function invalidateCache(...patterns: string[]): Promise<void> {
  try {
    for (const pattern of patterns) {
      const keys: string[] = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info("Cache invalidated", { pattern, count: keys.length });
      }
    }
  } catch (error) {
    logger.warn("Cache invalidation failed", { patterns, error });
  }
}
