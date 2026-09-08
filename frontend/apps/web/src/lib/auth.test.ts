import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { verifyIdToken } from '@/lib/firebase-admin'
import { db } from '@/lib/db'
import {
  getAuthUser,
  requireAuth,
  requireAdmin,
  requireActiveUser,
  requireFullyAuthorized,
  hasCompletedOnboarding,
  AuthRequiredError,
  ForbiddenError,
  EmailNotVerifiedError,
  InactiveUserError,
  OnboardingRequiredError,
} from '@/lib/auth'

const mockVerify = vi.mocked(verifyIdToken)
const mockFindUnique = vi.mocked(db.user.findUnique)

function makeRequest(): Request {
  return new Request('https://leadhunterclub.com/api/leads', {
    headers: { Authorization: 'Bearer fake-token' },
  })
}

function makeOnboardedUser() {
  return {
    status: 'ACTIVE',
    portfolio: 'https://portfolio.dev',
    website: null,
    linkedin: null,
    instagram: null,
    servicesOffered: ['Web Development'],
    preferredLeadCategories: ['SaaS'],
    outreachExperience: 'intermediate',
    discoverySource: 'Google',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAuthUser', () => {
  it('returns null when no Authorization header', async () => {
    const req = new Request('https://leadhunterclub.com/api/leads')
    expect(await getAuthUser(req)).toBeNull()
  })

  it('returns null when header is not a Bearer token', async () => {
    const req = new Request('https://leadhunterclub.com/api/leads', {
      headers: { Authorization: 'Basic abc123' },
    })
    expect(await getAuthUser(req)).toBeNull()
  })

  it('returns null when token verification fails', async () => {
    mockVerify.mockResolvedValue(null)
    expect(await getAuthUser(makeRequest())).toBeNull()
  })

  it('returns the decoded user on success', async () => {
    mockVerify.mockResolvedValue({
      uid: 'user-1',
      email: 'jane@example.com',
      email_verified: true,
    } as never)
    const user = await getAuthUser(makeRequest())
    expect(user?.uid).toBe('user-1')
    expect(user?.emailVerified).toBe(true)
  })
})

describe('requireAuth', () => {
  it('throws AuthRequiredError when not authenticated', async () => {
    mockVerify.mockResolvedValue(null)
    await expect(requireAuth(makeRequest())).rejects.toBeInstanceOf(AuthRequiredError)
  })

  it('returns the user when authenticated', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    const user = await requireAuth(makeRequest())
    expect(user.uid).toBe('user-1')
  })
})

describe('requireAdmin', () => {
  it('throws ForbiddenError for a non-admin user', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1' } as never)
    mockFindUnique.mockResolvedValue({ role: 'user' } as never)
    await expect(requireAdmin(makeRequest())).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('throws ForbiddenError when user has no DB record', async () => {
    mockVerify.mockResolvedValue({ uid: 'ghost' } as never)
    mockFindUnique.mockResolvedValue(null)
    await expect(requireAdmin(makeRequest())).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('returns user for an admin role', async () => {
    mockVerify.mockResolvedValue({ uid: 'admin-1' } as never)
    mockFindUnique.mockResolvedValue({ role: 'admin' } as never)
    const user = await requireAdmin(makeRequest())
    expect(user.uid).toBe('admin-1')
  })
})

describe('requireActiveUser', () => {
  it('throws EmailNotVerifiedError when email is not verified', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: false } as never)
    await expect(requireActiveUser(makeRequest())).rejects.toBeInstanceOf(
      EmailNotVerifiedError,
    )
  })

  it('throws InactiveUserError when user is not ACTIVE', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue({ status: 'PENDING' } as never)
    await expect(requireActiveUser(makeRequest())).rejects.toBeInstanceOf(InactiveUserError)
  })

  it('throws InactiveUserError when user record is missing', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue(null)
    await expect(requireActiveUser(makeRequest())).rejects.toBeInstanceOf(InactiveUserError)
  })

  it('returns the user when active', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue({ status: 'ACTIVE' } as never)
    const user = await requireActiveUser(makeRequest())
    expect(user.uid).toBe('user-1')
  })
})

describe('requireFullyAuthorized', () => {
  it('throws OnboardingRequiredError when onboarding is incomplete', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue({
      status: 'ACTIVE',
      portfolio: null,
      website: null,
      linkedin: null,
      instagram: null,
      servicesOffered: [],
      preferredLeadCategories: [],
      outreachExperience: null,
      discoverySource: null,
    } as never)
    await expect(requireFullyAuthorized(makeRequest())).rejects.toBeInstanceOf(
      OnboardingRequiredError,
    )
  })

  it('throws InactiveUserError when DB user is missing', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue(null)
    await expect(requireFullyAuthorized(makeRequest())).rejects.toBeInstanceOf(
      InactiveUserError,
    )
  })

  it('returns the user when fully authorized', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true } as never)
    mockFindUnique.mockResolvedValue(makeOnboardedUser() as never)
    const user = await requireFullyAuthorized(makeRequest())
    expect(user.uid).toBe('user-1')
  })
})

describe('hasCompletedOnboarding', () => {
  it('returns false when nothing is filled', () => {
    expect(
      hasCompletedOnboarding({
        portfolio: null,
        website: null,
        linkedin: null,
        instagram: null,
        servicesOffered: [],
        preferredLeadCategories: [],
        outreachExperience: null,
        discoverySource: null,
      }),
    ).toBe(false)
  })

  it('returns true when portfolio is set', () => {
    expect(hasCompletedOnboarding({ portfolio: 'https://x.dev' })).toBe(true)
  })

  it('returns true when servicesOffered is non-empty', () => {
    expect(hasCompletedOnboarding({ servicesOffered: ['SEO'] })).toBe(true)
  })

  it('returns true when outreachExperience is set', () => {
    expect(hasCompletedOnboarding({ outreachExperience: 'beginner' })).toBe(true)
  })

  it('returns true when discoverySource is set', () => {
    expect(hasCompletedOnboarding({ discoverySource: 'Twitter' })).toBe(true)
  })
})