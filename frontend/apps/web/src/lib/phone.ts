export function normalizePhone(input: string, defaultCountryCode: string = '91'): string {
  const cleaned = input.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) return cleaned

  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`

  if (cleaned.startsWith('011')) return `+${cleaned.slice(3)}`

  if (cleaned.length === 10) return `+${defaultCountryCode}${cleaned}`

  return cleaned.length > 0 ? `+${cleaned}` : cleaned
}

export function getPhoneDigits(input: string): string {
  return (input || '').replace(/\D/g, '')
}

/**
 * Checks if two phone numbers refer to the same device/user by checking:
 * 1. Exact string match
 * 2. Normalized E.164 match
 * 3. Last 10 digits match (standard national number suffix)
 */
export function arePhonesMatching(p1?: string | null, p2?: string | null): boolean {
  if (!p1 || !p2) return false
  const s1 = p1.trim()
  const s2 = p2.trim()
  if (s1 === s2) return true

  const n1 = normalizePhone(s1)
  const n2 = normalizePhone(s2)
  if (n1 && n2 && n1 === n2) return true

  const d1 = getPhoneDigits(s1)
  const d2 = getPhoneDigits(s2)
  if (d1 === d2) return true

  const last10_1 = d1.length >= 10 ? d1.slice(-10) : d1
  const last10_2 = d2.length >= 10 ? d2.slice(-10) : d2
  if (last10_1.length >= 10 && last10_1 === last10_2) return true

  return false
}

