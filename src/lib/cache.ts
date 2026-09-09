import Redis from "ioredis";
import logger from "@/lib/logger";

let redis: Redis | null = null;

try {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (url) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.connect().catch(() => {
      logger.warn("Redis connect failed, using memory cache only");
      redis = null;
    });
  }
} catch {
  logger.warn("Redis client creation failed, using memory cache only");
}

// --- In-memory fallback cache ---
const memCache = new Map<string, { data: unknown; expiresAt: number }>();
const MAX_MEM_ENTRIES = 200;

function memGet<T>(key: string): T | undefined {
  const entry = memCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function memSet(key: string, data: unknown, ttlSeconds: number) {
  if (memCache.size >= MAX_MEM_ENTRIES) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
  memCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memInvalidate(pattern: string) {
  const prefix = pattern.replace(/\*$/, "");
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) {
      memCache.delete(key);
    }
  }
}

/**
 * Get a cached value or fetch it from the provided function.
 * Uses Redis when available, falls back to in-memory cache.
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try Redis first
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        logger.info("Cache hit (redis)", { key });
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.warn("Redis read failed, trying memory cache", { key, error });
    }
  }

  // Try in-memory cache
  const memCached = memGet<T>(key);
  if (memCached !== undefined) {
    logger.info("Cache hit (memory)", { key });
    return memCached;
  }

  const data = await fetcher();

  // Write to both caches
  memSet(key, data, ttlSeconds);

  if (redis) {
    redis.set(key, JSON.stringify(data), "EX", ttlSeconds).then(
      () => logger.info("Cache set (redis)", { key, ttl: ttlSeconds }),
      (error) => logger.warn("Redis write failed", { key, error })
    );
  }

  return data;
}

/**
 * Invalidate cache keys matching the given prefix patterns.
 * Each pattern is used as a prefix glob (e.g. "budget:*").
 */
export async function invalidateCache(...patterns: string[]): Promise<void> {
  // Always invalidate memory cache
  for (const pattern of patterns) {
    memInvalidate(pattern);
  }

  // Try Redis invalidation
  if (redis) {
    try {
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.info("Cache invalidated (redis)", { pattern, count: keys.length });
        }
      }
    } catch (error) {
      logger.warn("Redis invalidation failed", { patterns, error });
    }
  }
}
