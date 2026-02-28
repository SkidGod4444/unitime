import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    "Missing required environment variables: UPSTASH_REDIS_REST_URL and/or UPSTASH_REDIS_REST_TOKEN",
  );
}

export const cache = new Redis({
  url: redisUrl,
  token: redisToken,
});

/**
 * Validates and sanitizes a cache key, ensuring only alphanumeric characters,
 * hyphens, colons, and underscores are present to prevent injection or errors.
 */
export const sanitizeCacheKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9_:\-]/g, "");
};

/**
 * Gets data from the Upstash Redis cache. If not found, executes the fetcher function,
 * caches the result for `ttlSeconds`, and returns the result.
 *
 * @param key The cache key
 * @param fetcher Async function to fetch the data if cache misses
 * @param ttlSeconds Time to live in seconds (default 60s)
 * @returns The cached or freshly fetched data
 */
export const getOrSetCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60,
): Promise<T> => {
  const sanitizedKey = sanitizeCacheKey(key);
  const cachedData = await cache.get<T>(sanitizedKey);

  if (cachedData !== null) {
    console.log(`[CACHE HIT] returned from cache for key: ${sanitizedKey}`);
    return cachedData;
  }

  const freshData = await fetcher();
  console.log(`[CACHE MISS] returned from db directly for key: ${sanitizedKey}`);
  await cache.set(sanitizedKey, freshData, { ex: ttlSeconds });
  return freshData;
};

/**
 * Invalidates (deletes) one or more specific keys from the Upstash Redis cache.
 *
 * @param keys The cache key(s) to invalidate
 */
export const invalidateCache = async (...keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  const sanitizedKeys = keys.map(sanitizeCacheKey);
  await cache.del(...sanitizedKeys);
};

/**
 * Publishes an event to an Upstash Realtime channel over the shared Redis instance.
 *
 * @param channel The realtime channel identifier (e.g. "class:cls_123")
 * @param payload The event data to publish
 */
export const publishEvent = async (channel: string, payload: any): Promise<void> => {
  try {
    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await cache.publish(channel, stringifiedPayload);
    console.log(`[PUBLISH] Event pushed to channel: ${channel}`);
  } catch (err) {
    console.error(`[PUBLISH ERROR] Failed to push event to ${channel}:`, err);
  }
};

