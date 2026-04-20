/**
 * In-memory sliding-window rate limiter. Per-process state; suitable for
 * Vercel Functions when paired with per-user keys where false positives
 * across workers are acceptable. Swap in Upstash Ratelimit for stricter
 * global counters (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 */

export interface RateLimitRule {
  max: number;
  windowMs: number;
}

interface Hit {
  timestamps: number[];
}

const buckets = new Map<string, Hit>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

export function rateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const cutoff = now - rule.windowMs;

  const entry = buckets.get(key) ?? { timestamps: [] };
  // Drop expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= rule.max) {
    const resetAt = (entry.timestamps[0] ?? now) + rule.windowMs;
    return { ok: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    ok: true,
    remaining: rule.max - entry.timestamps.length,
    resetAt: now + rule.windowMs,
  };
}

// ─── Common rules ─────────────────────────────────────────────────────────────

export const RULES = {
  aiChat: { max: 30, windowMs: 60 * 60 * 1000 }, // 30/hour
  aiTests: { max: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  auth: { max: 5, windowMs: 15 * 60 * 1000 }, // 5/15min
  ingestUpload: { max: 20, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;
