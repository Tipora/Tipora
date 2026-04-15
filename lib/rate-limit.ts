const hitCounts = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter.
 * Resets every `windowMs` milliseconds.
 * Not shared across serverless instances — use Redis for production scale.
 */
export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = hitCounts.get(key);

  if (!entry || now > entry.resetAt) {
    hitCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const remaining = Math.max(maxRequests - entry.count, 0);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining, resetAt: entry.resetAt };
}

/**
 * Apply rate limit and return a 429 Response if exceeded.
 * Returns null if the request is allowed.
 */
export function rateLimitResponse(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Response | null {
  const result = rateLimit(key, maxRequests, windowMs);
  if (!result.allowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
      },
    });
  }
  return null;
}
