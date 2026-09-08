import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/verify-session', () => ({
  verifySession: vi.fn(),
}))

import middleware from '@/middleware'
import { verifySession } from '@/lib/verify-session'

const mockVerify = vi.mocked(verifySession)

function makeRequest(path: string, opts: { cookie?: string } = {}) {
  const req = new NextRequest(`https://leadhunterclub.com${path}`, {
    headers: opts.cookie ? { Cookie: `__session=${opts.cookie}` } : {},
  })
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('middleware public routes', () => {
  it('allows public pages without a session', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.status).toBe(200)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('allows login/register/onboarding without a session', async () => {
    for (const path of ['/login', '/register', '/onboarding', '/verify-email', '/pending-approval']) {
      const res = await middleware(makeRequest(path))
      expect(res.status, `expected ${path} to pass`).toBe(200)
    }
  })

  it('passes through API routes without session validation', async () => {
    const res = await middleware(makeRequest('/api/leads'))
    expect(res.status).toBe(200)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('passes through static assets', async () => {
    const res = await middleware(makeRequest('/_next/static/chunks/x.js'))
    expect(res.status).toBe(200)
  })
})

describe('middleware protected routes', () => {
  it('redirects to /login when no session cookie', async () => {
    const res = await middleware(makeRequest('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects to /login with redirect param preserving path', async () => {
    const res = await middleware(makeRequest('/leads'))
    const location = res.headers.get('location') || ''
    expect(location).toContain('/login')
    expect(decodeURIComponent(location)).toContain('redirect=/leads')
  })

  it('redirects to /login and clears cookie when session invalid', async () => {
    mockVerify.mockResolvedValue(null)
    const res = await middleware(makeRequest('/dashboard', { cookie: 'bad-token' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('__session=')
    expect(setCookie.toLowerCase()).toContain('max-age=0')
  })

  it('redirects to /verify-email when email not verified', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: false })
    const res = await middleware(makeRequest('/dashboard', { cookie: 'valid' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/verify-email')
  })

  it('allows access when session is valid and verified', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true })
    const res = await middleware(makeRequest('/dashboard', { cookie: 'valid' }))
    expect(res.status).toBe(200)
  })

  it('protects admin routes', async () => {
    mockVerify.mockResolvedValue({ uid: 'user-1', email_verified: true })
    const res = await middleware(makeRequest('/admin', { cookie: 'valid' }))
    expect(res.status).toBe(200)
  })

  it('redirects admin routes to login without a session', async () => {
    const res = await middleware(makeRequest('/admin/users'))
    expect(res.status).toBe(307)
  })
})

describe('middleware security headers', () => {
  it('adds CORS headers for allowed origins', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.headers.get('access-control-allow-methods')).toBe(
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    )
  })

  it('handles OPTIONS preflight', async () => {
    const req = new NextRequest('https://leadhunterclub.com/api/leads', { method: 'OPTIONS' })
    const res = await middleware(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })
})