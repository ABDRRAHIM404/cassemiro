type RateLimitEntry = { count: number; resetsAt: number };

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetsAt <= now) {
    store.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) return { allowed: false, remaining: 0 };

  current.count += 1;
  return { allowed: true, remaining: limit - current.count };
}
