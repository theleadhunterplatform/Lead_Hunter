import crypto from 'crypto'

/**
 * Constant-time string comparison to prevent timing attacks against API keys and secrets.
 * Safely handles null/undefined inputs and mismatched lengths without leaking information.
 */
export function safeCompareStrings(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}
