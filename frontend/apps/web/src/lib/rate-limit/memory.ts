import type { RateLimiter, RateLimitResult } from './interface'

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, number[]>()
  private lastPrune = Date.now()

  private prune(now: number) {
    if (now - this.lastPrune < 60_000 && this.store.size < 5_000) return
    this.lastPrune = now
    for (const [k, timestamps] of this.store.entries()) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 300_000) {
        this.store.delete(k)
      }
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    this.prune(now)

    const timestamps = this.store.get(key) ?? []
    const valid = timestamps.filter((t) => now - t < windowMs)
    const allowed = valid.length < limit
    const resetAt = valid.length > 0 ? valid[0] + windowMs : now + windowMs

    if (allowed) {
      valid.push(now)
      this.store.set(key, valid)
    } else if (valid.length === 0) {
      this.store.delete(key)
    } else {
      this.store.set(key, valid)
    }

    return {
      allowed,
      remaining: Math.max(0, limit - valid.length),
      resetAt,
    }
  }
}
