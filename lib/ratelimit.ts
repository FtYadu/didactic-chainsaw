import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter that allows 50 requests per 15 minutes
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '15 m'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

// Free tier rate limit (more restrictive)
export const freeTierRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '15 m'),
      analytics: true,
      prefix: '@upstash/ratelimit:free',
    })
  : null;

// Premium tier rate limit (less restrictive)
export const premiumRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, '15 m'),
      analytics: true,
      prefix: '@upstash/ratelimit:premium',
    })
  : null;

export async function checkRateLimit(
  identifier: string,
  tier: 'free' | 'standard' | 'premium' = 'standard'
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If no Redis configured, allow all requests
  if (!redis) {
    return {
      success: true,
      limit: 1000,
      remaining: 1000,
      reset: Date.now() + 900000, // 15 minutes from now
    };
  }

  const limiter =
    tier === 'free'
      ? freeTierRatelimit
      : tier === 'premium'
        ? premiumRatelimit
        : ratelimit;

  if (!limiter) {
    return {
      success: true,
      limit: 1000,
      remaining: 1000,
      reset: Date.now() + 900000,
    };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}
