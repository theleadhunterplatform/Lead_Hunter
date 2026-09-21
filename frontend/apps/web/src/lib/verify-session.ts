let cachedKeys: { keys: Record<string, JsonWebKey>; expiresAt: number } | null = null

function base64UrlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function parseJwtPart(part: string): Record<string, unknown> | null {
  try {
    const bytes = base64UrlToBytes(part)
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

async function getPublicKey(kid: string): Promise<JsonWebKey | null> {
  const now = Date.now()

  if (!cachedKeys || now > cachedKeys.expiresAt) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
      )
      const data = (await res.json()) as { keys: JsonWebKey[] }

      const keys: Record<string, JsonWebKey> = {}
      for (const key of data.keys) {
        const keyKid = (key as Record<string, unknown>).kid as string | undefined
        if (keyKid) keys[keyKid] = key
      }

      cachedKeys = { keys, expiresAt: now + 86_400_000 }
    } catch {
      if (!cachedKeys) return null
    }
  }

  const kidKey = cachedKeys.keys[kid]
  return kidKey ?? null
}

export interface FirebaseIdToken {
  uid: string
  email?: string
  name?: string
  phone_number?: string
  picture?: string
  email_verified?: boolean
}

export async function verifySession(
  token: string,
): Promise<{ uid: string; email_verified?: boolean } | null> {
  const decoded = await verifyFirebaseToken(token)
  if (!decoded) return null
  return { uid: decoded.uid, email_verified: decoded.email_verified }
}

export async function verifyFirebaseToken(token: string): Promise<FirebaseIdToken | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = parseJwtPart(parts[0])
    if (!header?.kid || typeof header.kid !== 'string') return null

    const payload = parseJwtPart(parts[1]) as Record<string, unknown> | null
    if (!payload?.sub || typeof payload.sub !== 'string') return null
    if (!payload.exp || Date.now() / 1000 > (payload.exp as number)) return null
    if (payload.aud !== projectId) return null
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null

    const jwkKey = await getPublicKey(header.kid)
    if (!jwkKey?.n) return null

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwkKey.n as string, e: (jwkKey.e as string) || 'AQAB', alg: 'RS256' },
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['verify'],
    )

    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const signature = base64UrlToBytes(parts[2])

    const isValid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      cryptoKey,
      signature,
      signingInput,
    )

    if (!isValid) return null

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      phone_number: typeof payload.phone_number === 'string' ? payload.phone_number : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      email_verified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    }
  } catch {
    return null
  }
}
