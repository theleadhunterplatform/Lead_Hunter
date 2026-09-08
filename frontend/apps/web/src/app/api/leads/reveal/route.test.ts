import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireFullyAuthorized: vi.fn(),
  AuthRequiredError: class extends Error {
    name = 'AuthRequiredError'
  },
  InactiveUserError: class extends Error {
    name = 'InactiveUserError'
  },
  EmailNotVerifiedError: class extends Error {
    name = 'EmailNotVerifiedError'
  },
  OnboardingRequiredError: class extends Error {
    name = 'OnboardingRequiredError'
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(fakeTx)),
    userLeadState: { findUnique: vi.fn() },
    lead: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/external-api/client', () => ({
  getPost: vi.fn(),
  claimPost: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByKey: vi.fn(),
}))

vi.mock('@/lib/services/credits', () => ({
  creditService: {
    getTotalBalance: vi.fn(),
    deductInTx: vi.fn(),
  },
  InsufficientCreditsError: class extends Error {
    required: number
    constructor(required: number) {
      super('Insufficient credits')
      this.required = required
    }
  },
}))

import { POST } from '@/app/api/leads/reveal/route'
import { requireFullyAuthorized } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPost, claimPost } from '@/lib/external-api/client'
import { rateLimitByKey } from '@/lib/rate-limit'
import { creditService } from '@/lib/services/credits'

let fakeTx: any

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    content: 'some content',
    platform: 'linkedin',
    author: { name: 'Jane', info: 'Designer' },
    email: 'jane@example.com',
    contact_info: { phone_numbers: [{ number: '+1' }], emails: [], name: 'Jane' },
    intelligence: '## One-Liner\nDo good work',
    keyword: null,
    ai_score: 80,
    review_status: 'approved',
    source: 'scrape',
    is_claimed: false,
    posted_at: { postedAgoShort: '2h' },
    created_at: '2026-01-01',
    ...overrides,
  }
}

function makeRevealRequest(body: Record<string, unknown>) {
  return new NextRequest('https://leadhunterclub.com/api/leads/reveal', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireFullyAuthorized).mockResolvedValue({ uid: 'user-1' } as never)
  vi.mocked(rateLimitByKey).mockResolvedValue({ allowed: true, remaining: 29, resetAt: 0 })
  vi.mocked(db.userLeadState.findUnique).mockResolvedValue(null as never)
  fakeTx = {
    $executeRaw: vi.fn().mockResolvedValue([{}]),
    lead: { upsert: vi.fn().mockResolvedValue({}) },
    userLeadState: { upsert: vi.fn().mockResolvedValue({}) },
    creditAccount: {
      findUnique: vi.fn().mockResolvedValue({
        subscriptionBalance: 100,
        bonusBalance: 0,
        rolloverBalance: 0,
      }),
    },
  }
})

describe('POST /api/leads/reveal', () => {
  it('returns 400 VALIDATION_ERROR for missing leadId', async () => {
    const res = await POST(makeRevealRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimitByKey).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now(),
    })
    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(429)
    expect((await res.json()).code).toBe('RATE_LIMITED')
  })

  it('returns 400 NO_CONTACT_INFO when lead has no contact data', async () => {
    vi.mocked(getPost).mockResolvedValue(
      makePost({
        email: null,
        contact_info: null,
        author: { name: 'Jane' },
      }) as never,
    )
    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('NO_CONTACT_INFO')
  })

  it('returns 400 INSUFFICIENT_CREDITS when balance is too low', async () => {
    vi.mocked(getPost).mockResolvedValue(makePost() as never)
    vi.mocked(creditService.getTotalBalance).mockResolvedValue(2)
    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INSUFFICIENT_CREDITS')
    expect(json.required).toBeGreaterThan(0)
  })

  it('reveals without charging when already claimed externally', async () => {
    vi.mocked(getPost).mockResolvedValue(makePost({ is_claimed: true }) as never)
    vi.mocked(db.userLeadState.findUnique).mockResolvedValue(null)

    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.coinsUsed).toBe(0)
    expect(creditService.deductInTx).not.toHaveBeenCalled()
  })

  it('reveals without charging when user already revealed the lead', async () => {
    vi.mocked(getPost).mockResolvedValue(makePost() as never)
    vi.mocked(db.userLeadState.findUnique).mockResolvedValue({
      isRevealed: true,
    } as never)

    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isRevealed).toBe(true)
    expect(json.coinsUsed).toBe(0)
  })

  it('deducts credits and claims the lead on successful reveal', async () => {
    vi.mocked(getPost).mockResolvedValue(makePost() as never)
    vi.mocked(claimPost).mockResolvedValue(makePost() as never)
    vi.mocked(creditService.getTotalBalance).mockResolvedValue(100)
    vi.mocked(creditService.deductInTx).mockResolvedValue({
      subscriptionBalance: 90,
      bonusBalance: 0,
      rolloverBalance: 0,
    } as never)

    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.isRevealed).toBe(true)
    expect(json.coinsUsed).toBe(10) // phone + email
    expect(json.email).toBe('jane@example.com')
    expect(creditService.deductInTx).toHaveBeenCalled()
    expect(claimPost).toHaveBeenCalledWith('lead-1')
  })

  it('returns credits remaining after reveal', async () => {
    vi.mocked(getPost).mockResolvedValue(makePost() as never)
    vi.mocked(claimPost).mockResolvedValue(makePost() as never)
    vi.mocked(creditService.getTotalBalance).mockResolvedValue(100)
    vi.mocked(creditService.deductInTx).mockResolvedValue({
      subscriptionBalance: 85,
      bonusBalance: 5,
      rolloverBalance: 0,
    } as never)

    const res = await POST(makeRevealRequest({ leadId: 'lead-1' }))
    const json = await res.json()
    expect(json.creditsRemaining).toBe(90)
  })
})