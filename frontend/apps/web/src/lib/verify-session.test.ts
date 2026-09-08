import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import { generateKeyPairSync, createSign } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'jwk' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const KID = 'test-kid-1'

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function makeToken(payload: Record<string, unknown>, opts: { validSig?: boolean } = {}): string {
  const header = { alg: 'RS256', kid: KID, typ: 'JWT' }
  const headerB64 = base64Url(JSON.stringify(header))
  const payloadB64 = base64Url(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`

  const sign = createSign('SHA256')
  sign.update(signingInput)
  sign.end()
  const signature =
    opts.validSig === false ? Buffer.from('bad') : sign.sign(privateKey)

  return `${signingInput}.${base64Url(signature)}`
}

function makeJwksResponse() {
  return {
    ok: true,
    json: async () => ({
      keys: [
        {
          kid: KID,
          kty: 'RSA',
          n: publicKey.n,
          e: publicKey.e || 'AQAB',
          alg: 'RS256',
        },
      ],
    }),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

async function loadVerifySession() {
  return await import('@/lib/verify-session')
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('verifyFirebaseToken', () => {
  it('returns null for a malformed token', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    expect(await verifyFirebaseToken('not.a.jwt')).toBeNull()
    expect(await verifyFirebaseToken('')).toBeNull()
    expect(await verifyFirebaseToken('a.b')).toBeNull()
  })

  it('returns null when project id is not configured', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    expect(await verifyFirebaseToken('a.b.c')).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) - 100,
      aud: 'test-project',
      iss: 'https://securetoken.google.com/test-project',
    })
    expect(await verifyFirebaseToken(token)).toBeNull()
  })

  it('returns null when audience does not match project', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'other-project',
      iss: 'https://securetoken.google.com/test-project',
    })
    expect(await verifyFirebaseToken(token)).toBeNull()
  })

  it('returns null when issuer is wrong', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'test-project',
      iss: 'https://evil.example.com',
    })
    expect(await verifyFirebaseToken(token)).toBeNull()
  })

  it('returns null when signature is invalid', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken(
      {
        sub: 'user-1',
        exp: Math.floor(Date.now() / 1000) + 1000,
        aud: 'test-project',
        iss: 'https://securetoken.google.com/test-project',
      },
      { validSig: false },
    )
    expect(await verifyFirebaseToken(token)).toBeNull()
  })

  it('returns null when JWKS fetch fails', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as never)

    const token = makeToken({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'test-project',
      iss: 'https://securetoken.google.com/test-project',
    })
    expect(await verifyFirebaseToken(token)).toBeNull()
  })

  it('decodes a valid token and returns the payload', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken({
      sub: 'user-1',
      email: 'jane@example.com',
      email_verified: true,
      name: 'Jane',
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'test-project',
      iss: 'https://securetoken.google.com/test-project',
    })
    const decoded = await verifyFirebaseToken(token)
    expect(decoded?.uid).toBe('user-1')
    expect(decoded?.email).toBe('jane@example.com')
    expect(decoded?.email_verified).toBe(true)
  })

  it('returns null when the key kid is unknown', async () => {
    const { verifyFirebaseToken } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const header = { alg: 'RS256', kid: 'unknown-kid', typ: 'JWT' }
    const payload = {
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'test-project',
      iss: 'https://securetoken.google.com/test-project',
    }
    const token = `${base64Url(JSON.stringify(header))}.${base64Url(
      JSON.stringify(payload),
    )}.${base64Url('sig')}`
    expect(await verifyFirebaseToken(token)).toBeNull()
  })
})

describe('verifySession', () => {
  it('returns uid and email_verified for a valid token', async () => {
    const { verifySession } = await loadVerifySession()
    fetchMock.mockResolvedValueOnce(makeJwksResponse() as never)

    const token = makeToken({
      sub: 'user-1',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 1000,
      aud: 'test-project',
      iss: 'https://securetoken.google.com/test-project',
    })
    const session = await verifySession(token)
    expect(session).toEqual({ uid: 'user-1', email_verified: true })
  })

  it('returns null for an invalid token', async () => {
    const { verifySession } = await loadVerifySession()
    expect(await verifySession('garbage')).toBeNull()
  })
})