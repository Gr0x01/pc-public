// In-memory rate limiter — MVP pattern for low-traffic solo dev.
// Not effective across multiple Vercel instances. Entries are lazy-evicted
// on next access. Upgrade to Redis/Vercel KV if abuse becomes a concern.

const _map = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = _map.get(key);

  if (!entry || now > entry.resetAt) {
    _map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
