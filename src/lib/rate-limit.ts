import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter — works across Vercel instances.
// Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Falls back to allow-all in local dev when env vars are missing.
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Cache Ratelimit instances by window config to avoid re-creation
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${limit}:${windowSeconds}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: "pc_rl",
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Check rate limit for a given key.
 * @returns true if allowed, false if rate limited.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const limiter = getLimiter(limit, windowSeconds);
  if (!limiter) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[rate-limit] Upstash not configured — allowing request");
    }
    return true;
  }

  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    console.error("[rate-limit] Redis error, failing open:", err);
    return true;
  }
}
