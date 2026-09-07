import type { RateLimiter } from './interface'
import { MemoryRateLimiter } from './memory'

let instance: RateLimiter | null = null

export async function getRateLimiter(): Promise<RateLimiter> {
  if (instance) return instance

  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { UpstashRateLimiter } = await import('./upstash')
    instance = new UpstashRateLimiter()
  } else {
    instance = new MemoryRateLimiter()
  }

  return instance
}

export async function rateLimitByKey(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limiter = await getRateLimiter()
  return limiter.check(key, limit, windowMs)
}
