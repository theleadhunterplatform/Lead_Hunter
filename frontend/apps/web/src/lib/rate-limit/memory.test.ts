import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRateLimiter } from '@/lib/rate-limit/memory'
import { rateLimitByKey } from '@/lib/rate-limit'

describe('MemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', async () => {
    const limiter = new MemoryRateLimiter()
    const r1 = await limiter.check('key', 3, 1000)
    const r2 = await limiter.check('key', 3, 1000)
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.remaining).toBe(1)
  })

  it('blocks requests once the limit is reached', async () => {
    const limiter = new MemoryRateLimiter()
    await limiter.check('key', 2, 1000)
    await limiter.check('key', 2, 1000)
    const blocked = await limiter.check('key', 2, 1000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets the window after windowMs elapses', async () => {
    const limiter = new MemoryRateLimiter()
    await limiter.check('key', 2, 1000)
    await limiter.check('key', 2, 1000)
    const blocked = await limiter.check('key', 2, 1000)
    expect(blocked.allowed).toBe(false)

    vi.advanceTimersByTime(1001)
    const allowed = await limiter.check('key', 2, 1000)
    expect(allowed.allowed).toBe(true)
  })

  it('tracks keys independently', async () => {
    const limiter = new MemoryRateLimiter()
    await limiter.check('a', 1, 1000)
    const b = await limiter.check('b', 1, 1000)
    const a2 = await limiter.check('a', 1, 1000)
    expect(b.allowed).toBe(true)
    expect(a2.allowed).toBe(false)
  })
})

describe('rateLimitByKey', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses the memory limiter when no Redis env is configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const first = await rateLimitByKey('user:1', 1, 1000)
    const second = await rateLimitByKey('user:1', 1, 1000)
    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(false)
  })
})