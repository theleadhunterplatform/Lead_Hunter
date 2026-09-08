export interface Country {
  name: string
  code: string
  dialCode: string
  flag: string
  format: string
}

export const COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', format: '98765 43210' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', format: '(555) 123-4567' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', format: '7911 123456' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', format: '50 123 4567' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', format: '(555) 123-4567' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', format: '412 345 678' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', format: '8123 4567' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', format: '151 2345678' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', format: '6 12 34 56 78' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', format: '50 123 4567' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', format: '6 12345678' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', format: '85 123 4567' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', format: '78 123 45 67' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', format: '612 34 56 78' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', format: '312 345 6789' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', format: '70 123 45 67' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', format: '412 34 567' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', format: '20 12 34 56' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', format: '512 345 678' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹', format: '912 345 678' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', format: '664 1234567' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', format: '470 12 34 56' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', format: '21 123 4567' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', format: '71 123 4567' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', format: '802 123 4567' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', format: '712 345678' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', format: '301 2345678' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', format: '1712 345678' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵', format: '981 2345678' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰', format: '71 234 5678' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', format: '917 123 4567' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', format: '12 345 6789' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', format: '812 3456 7890' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', format: '81 234 5678' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', format: '91 234 5678' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', format: '90 1234 5678' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', format: '10 1234 5678' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', format: '11 91234 5678' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', format: '55 1234 5678' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', format: '9 11 1234 5678' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴', format: '300 123 4567' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱', format: '9 1234 5678' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', format: '3312 3456' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', format: '5123 4567' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', format: '3612 3456' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲', format: '9123 4567' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷', format: '532 123 4567' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬', format: '100 123 4567' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', format: '50 123 4567' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // India (+91)

export function findCountryByDialCode(dialCode: string): Country | undefined {
  const clean = dialCode.startsWith('+') ? dialCode : `+${dialCode}`
  return COUNTRIES.find((c) => c.dialCode === clean)
}

export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase())
}

/**
 * Parses a combined phone string (e.g. "+91 9876543210" or "+919876543210")
 * into country dial code and local number.
 */
export function extractCountryAndLocalNumber(input: string): {
  dialCode: string
  localNumber: string
} {
  const trimmed = input.trim()
  if (!trimmed) {
    return { dialCode: DEFAULT_COUNTRY.dialCode, localNumber: '' }
  }

  if (trimmed.startsWith('+')) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)
    for (const c of sorted) {
      if (trimmed.startsWith(c.dialCode)) {
        const local = trimmed.slice(c.dialCode.length).trim()
        return { dialCode: c.dialCode, localNumber: local }
      }
    }
  }

  return { dialCode: DEFAULT_COUNTRY.dialCode, localNumber: trimmed }
}
