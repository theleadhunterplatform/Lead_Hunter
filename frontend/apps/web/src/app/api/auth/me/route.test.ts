import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByKey: vi.fn(),
}))

vi.mock('@/lib/services/referral', () => ({
  referralService: {
    attributeReferral: vi.fn(),
  },
}))

vi.mock('@/lib/firebase-admin', () => ({
  getAdminAuthInstance: vi.fn(),
}))

import { GET, PATCH } from '@/app/api/auth/me/route'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimitByKey } from '@/lib/rate-limit'
import { referralService } from '@/lib/services/referral'

const authUser = {
  uid: 'u1',
  email: 'ann@example.com',
  name: 'Ann',
  phone: null,
  emailVerified: true,
}

function makeUser() {
  return {
    id: 'u1',
    email: 'ann@example.com',
    name: 'Ann',
    phone: '+10000000000',
    role: 'user',
    status: 'ACTIVE',
    plan: 'FREE',
    emailVerified: new Date('2026-01-01'),
    city: 'Berlin',
    portfolio: 'https://ann.dev',
    website: null,
    linkedin: 'https://linkedin.com/in/ann',
    instagram: null,
    dribbble: null,
    behance: null,
    github: 'https://github.com/ann',
    twitter: null,
    servicesOffered: ['Cold Email'],
    preferredLeadCategories: ['SaaS'],
    outreachExperience: '2 years of cold outreach',
    discoverySource: 'Twitter',
    creditAccount: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }
}

function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/auth/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getReq() {
  return new NextRequest('http://localhost/api/auth/me', { method: 'GET' })
}

function lastPatchUpdate(): Record<string, any> {
  const calls = (db.user.upsert as ReturnType<typeof vi.fn>).mock.calls
  return calls[calls.length - 1][0].update
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthUser).mockResolvedValue(authUser as never)
  vi.mocked(rateLimitByKey).mockResolvedValue({ allowed: true, remaining: 10 } as never)
  vi.mocked(db.user.findMany).mockResolvedValue([] as never)
  vi.mocked(db.user.upsert).mockImplementation(((args: any) =>
    Promise.resolve({
      ...makeUser(),
      ...args.update,
    })) as never)
  vi.mocked(referralService.attributeReferral).mockResolvedValue(undefined as never)
})

describe('PATCH /api/auth/me — profile & socials', () => {
  it('updates social links and arrays in a single partial save', async () => {
    const res = await PATCH(
      patchReq({
        linkedin: 'https://linkedin.com/in/ann-new',
        github: 'https://github.com/ann2',
        servicesOffered: ['Cold Email', 'LinkedIn Ads'],
        preferredLeadCategories: ['SaaS', 'Agencies'],
        outreachExperience: '3 years of cold outreach',
        discoverySource: 'A friend',
      }),
    )

    expect(res.status).toBe(200)
    const update = lastPatchUpdate()
    expect(update.linkedin).toBe('https://linkedin.com/in/ann-new')
    expect(update.github).toBe('https://github.com/ann2')
    expect(update.servicesOffered).toEqual(['Cold Email', 'LinkedIn Ads'])
    expect(update.preferredLeadCategories).toEqual(['SaaS', 'Agencies'])
    expect(update.outreachExperience).toBe('3 years of cold outreach')
    expect(update.discoverySource).toBe('A friend')

    const json = await res.json()
    expect(json.data.linkedin).toBe('https://linkedin.com/in/ann-new')
    expect(json.data.servicesOffered).toEqual(['Cold Email', 'LinkedIn Ads'])
    expect(json.data.city).toBe('Berlin')
  })

  it('clears optional social links when sent an empty string or null', async () => {
    const res = await PATCH(patchReq({ portfolio: '', website: null }))
    expect(res.status).toBe(200)
    const update = lastPatchUpdate()
    expect(update.portfolio).toBeNull()
    expect(update.website).toBeNull()
  })

  it('rejects clearing gate-critical fields (linkedin, experience, source)', async () => {
    for (const body of [
      { linkedin: '' },
      { linkedin: null },
      { outreachExperience: '   ' },
      { discoverySource: '' },
      { servicesOffered: [] },
      { preferredLeadCategories: [] },
    ]) {
      const res = await PATCH(patchReq(body))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('VALIDATION_ERROR')
    }
    expect(db.user.upsert).not.toHaveBeenCalled()
  })

  it('rejects a generic homepage as a LinkedIn profile', async () => {
    const res = await PATCH(patchReq({ linkedin: 'linkedin.com' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_SOCIAL_LINK')
    expect(db.user.upsert).not.toHaveBeenCalled()
  })

  it('rejects non-string social values', async () => {
    const res = await PATCH(patchReq({ instagram: 12345 }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
    expect(db.user.upsert).not.toHaveBeenCalled()
  })

  it('rejects social links already used by ANOTHER account, excluding self', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'other-user',
        linkedin: 'https://linkedin.com/in/taken',
        portfolio: null,
        website: null,
        twitter: null,
        instagram: null,
        github: null,
        dribbble: null,
        behance: null,
      },
    ] as never)

    const res = await PATCH(patchReq({ linkedin: 'https://linkedin.com/in/taken' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('DUPLICATE_SOCIAL_LINK')
    expect(db.user.upsert).not.toHaveBeenCalled()

    const where = vi.mocked(db.user.findMany).mock.calls[0][0]?.where as any
    expect(where.id).toEqual({ not: 'u1' })
  })

  it('passes when duplicate search returns nothing', async () => {
    const res = await PATCH(patchReq({ linkedin: 'https://linkedin.com/in/free' }))
    expect(res.status).toBe(200)
    expect(lastPatchUpdate().linkedin).toBe('https://linkedin.com/in/free')
  })

  it('trims and dedupes array entries and enforces caps', async () => {
    const res = await PATCH(
      patchReq({ servicesOffered: ['  Cold Email  ', 'Cold Email', 'LinkedIn Ads'] }),
    )
    expect(res.status).toBe(200)
    expect(lastPatchUpdate().servicesOffered).toEqual(['Cold Email', 'LinkedIn Ads'])

    const tooMany = await PATCH(
      patchReq({ servicesOffered: Array.from({ length: 26 }, (_, i) => `svc-${i}`) }),
    )
    expect(tooMany.status).toBe(400)

    const tooLong = await PATCH(patchReq({ servicesOffered: ['x'.repeat(81)] }))
    expect(tooLong.status).toBe(400)
    expect(db.user.upsert).toHaveBeenCalledTimes(1)
  })

  it('never writes privileged fields passed in the body', async () => {
    const res = await PATCH(
      patchReq({
        role: 'admin',
        plan: 'ALPHA',
        status: 'ACTIVE',
        email: 'evil@example.com',
        id: 'someone-else',
        creditAccount: { subscriptionBalance: 999999 },
      }),
    )
    expect(res.status).toBe(200)
    const update = lastPatchUpdate()
    for (const key of ['role', 'plan', 'status', 'email', 'id', 'creditAccount']) {
      expect(update).not.toHaveProperty(key)
    }
  })

  it('keeps legacy name/city/referral behavior intact', async () => {
    const res = await PATCH(patchReq({ name: '  Bob  ', city: ' Paris ', referralCode: 'REF123' }))
    expect(res.status).toBe(200)
    const update = lastPatchUpdate()
    expect(update.name).toBe('Bob')
    expect(update.city).toBe('Paris')
    expect(referralService.attributeReferral).toHaveBeenCalledWith({
      referredUserId: 'u1',
      referralCode: 'REF123',
    })
    const json = await res.json()
    expect(json.data.name).toBe('Bob')
  })

  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null as never)
    const res = await PATCH(patchReq({ linkedin: 'https://linkedin.com/in/ann' }))
    expect(res.status).toBe(401)
    expect(db.user.upsert).not.toHaveBeenCalled()
  })
})

describe('GET /api/auth/me — profile prefill', () => {
  it('returns the profile fields the settings editor prefills from', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never)
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.linkedin).toBe('https://linkedin.com/in/ann')
    expect(json.data.portfolio).toBe('https://ann.dev')
    expect(json.data.city).toBe('Berlin')
    expect(json.data.servicesOffered).toEqual(['Cold Email'])
    expect(json.data.preferredLeadCategories).toEqual(['SaaS'])
    expect(json.data.outreachExperience).toBe('2 years of cold outreach')
    expect(json.data.discoverySource).toBe('Twitter')
    expect(json.data.hasCompletedOnboarding).toBe(true)
  })
})
