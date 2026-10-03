export function normalizePhone(input: string, defaultCountryCode: string = '91'): string {
  const cleaned = input.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) return cleaned

  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`

  if (cleaned.startsWith('011')) return `+${cleaned.slice(3)}`

  if (cleaned.length === 10) return `+${defaultCountryCode}${cleaned}`

  return cleaned.length > 0 ? `+${cleaned}` : cleaned
}

/**
 * Real-time phone format check for live form feedback.
 * Accepts any formatting characters but requires 7–15 digits
 * (E.164 allows at most 15; the shortest real national numbers are 7 digits).
 */
export function isValidPhoneNumber(input: string): boolean {
  const digits = input.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export function getPhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

export function arePhonesMatching(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const digitsA = getPhoneDigits(a)
  const digitsB = getPhoneDigits(b)
  if (!digitsA || !digitsB) return false
  if (digitsA === digitsB) return true
  if (digitsA.length >= 10 && digitsB.length >= 10) {
    return digitsA.slice(-10) === digitsB.slice(-10)
  }
  return false
}
