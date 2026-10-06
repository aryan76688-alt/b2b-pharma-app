interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const tracker = new Map<string, RateLimitEntry>();

// Purge expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tracker.entries()) {
    if (now > entry.resetAt) {
      tracker.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const entry = tracker.get(key);

  if (!entry || now > entry.resetAt) {
    tracker.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count };
}

export function resetRateLimit(key: string) {
  tracker.delete(key);
}
