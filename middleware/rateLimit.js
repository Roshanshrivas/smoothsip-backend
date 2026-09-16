// Simple in-memory rate limiter. Single-server safe.
// If you ever scale to multiple instances, swap this for Redis-backed express-rate-limit.

const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, v] of buckets) if (v.resetAt < now) buckets.delete(key);
}, 5 * 60 * 1000).unref();

export const rateLimit = ({ max, windowMs, prefix = 'rl', keyFn }) => (req, res, next) => {
  const key = `${prefix}:${keyFn ? keyFn(req) : req.ip}`;
  const now = Date.now();
  let b = buckets.get(key);

  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;

  if (b.count > max) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    res.set('Retry-After', String(retry));
    return res.status(429).json({
      success: false,
      message: `Too many requests. Try again in ${retry}s.`,
      code: 'RATE_LIMITED',
    });
  }
  next();
};