import type { RateLimiter, RateLimitResult } from './interface'

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, number[]>()

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const timestamps = this.store.get(key) ?? []

    const valid = timestamps.filter((t) => now - t < windowMs)
    const allowed = valid.length < limit
    const resetAt = valid.length > 0 ? valid[0] + windowMs : now + windowMs

    if (allowed) {
      valid.push(now)
      this.store.set(key, valid)
    }

    return {
      allowed,
      remaining: Math.max(0, limit - valid.length),
      resetAt,
    }
  }
}
