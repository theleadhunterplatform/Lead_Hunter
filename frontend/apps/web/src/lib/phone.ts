export function normalizePhone(input: string, defaultCountryCode: string = '91'): string {
  const cleaned = input.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) return cleaned

  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`

  if (cleaned.startsWith('011')) return `+${cleaned.slice(3)}`

  if (cleaned.length === 10) return `+${defaultCountryCode}${cleaned}`

  return cleaned.length > 0 ? `+${cleaned}` : cleaned
}
