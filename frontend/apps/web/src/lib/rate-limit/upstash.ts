import type { RateLimiter, RateLimitResult } from './interface'

export class UpstashRateLimiter implements RateLimiter {
  private client: any = null

  private async initClient() {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')

    return Ratelimit
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    if (!this.client) {
      const Ratelimit = await this.initClient()
      const { Redis } = await import('@upstash/redis')
      this.client = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        analytics: true,
      })
    }

    const result = await this.client.limit(key)

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: Date.now() + windowMs,
    }
  }
}
