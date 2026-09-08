import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findCountryByDialCode,
  findCountryByCode,
  extractCountryAndLocalNumber,
} from './countries'
import { normalizePhone } from './phone'

describe('countries lib', () => {
  it('has India as the default country', () => {
    expect(DEFAULT_COUNTRY.code).toBe('IN')
    expect(DEFAULT_COUNTRY.dialCode).toBe('+91')
    expect(DEFAULT_COUNTRY.flag).toBe('🇮🇳')
    expect(COUNTRIES[0].code).toBe('IN')
  })

  it('finds country by dial code', () => {
    expect(findCountryByDialCode('+91')?.code).toBe('IN')
    expect(findCountryByDialCode('91')?.code).toBe('IN')
    expect(findCountryByDialCode('+1')?.code).toBe('US')
    expect(findCountryByDialCode('+44')?.code).toBe('GB')
    expect(findCountryByDialCode('+971')?.code).toBe('AE')
    expect(findCountryByDialCode('+999')).toBeUndefined()
  })

  it('finds country by ISO code', () => {
    expect(findCountryByCode('in')?.dialCode).toBe('+91')
    expect(findCountryByCode('US')?.dialCode).toBe('+1')
    expect(findCountryByCode('gb')?.dialCode).toBe('+44')
    expect(findCountryByCode('ZZ')).toBeUndefined()
  })

  it('extracts country code and local number from combined strings', () => {
    expect(extractCountryAndLocalNumber('+91 9876543210')).toEqual({
      dialCode: '+91',
      localNumber: '9876543210',
    })
    expect(extractCountryAndLocalNumber('+1 (555) 123-4567')).toEqual({
      dialCode: '+1',
      localNumber: '(555) 123-4567',
    })
    expect(extractCountryAndLocalNumber('+971501234567')).toEqual({
      dialCode: '+971',
      localNumber: '501234567',
    })
    expect(extractCountryAndLocalNumber('9876543210')).toEqual({
      dialCode: '+91',
      localNumber: '9876543210',
    })
    expect(extractCountryAndLocalNumber('')).toEqual({
      dialCode: '+91',
      localNumber: '',
    })
  })
})

describe('normalizePhone with India default', () => {
  it('normalizes 10-digit number to Indian +91', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210')
  })

  it('preserves existing + dial code', () => {
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567')
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210')
    expect(normalizePhone('+44 7911 123456')).toBe('+447911123456')
  })

  it('normalizes 11-digit US number starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+15551234567')
  })
})
