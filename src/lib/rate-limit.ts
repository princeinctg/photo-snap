import { clientIp } from "./session";

interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __psosRateLimit: Map<string, Bucket> | undefined;
}

const store: Map<string, Bucket> =
  global.__psosRateLimit || (global.__psosRateLimit = new Map());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

/**
 * Fixed-window in-memory rate limiter.
 *
 * This protects a single Node process. For multi-instance deployments put the
 * same interface in front of Redis/Upstash; the API routes only depend on
 * `checkRateLimit`, so swapping the store is a contained change.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0, limit };
  }

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0, limit };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
    limit,
  };
}

export function rateLimitKey(req: Request, bucket: string, discriminator = ""): string {
  const ip = clientIp(req) || "local";
  return `${bucket}:${ip}:${discriminator.toLowerCase()}`;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

// Opportunistic cleanup so the map does not grow forever in long-running dev servers.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    store.forEach((bucket, key) => {
      if (bucket.resetAt <= now) store.delete(key);
    });
  }, 10 * 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();
}
