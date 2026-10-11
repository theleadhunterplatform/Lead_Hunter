import { describe, expect, it } from 'vitest'
import { pickHint, type GuideStatus } from './guideCopy'

const base: GuideStatus = {
  step: 1,
  focused: null,
  linkedin: '',
  linkedinOk: false,
  phone: '',
  phoneOk: false,
  step1Error: '',
  servicesCount: 0,
  nichesCount: 0,
  hasExperience: false,
  canProceedFromStep2: false,
  discoverySource: '',
  discoveryOther: '',
  canSubmit: false,
  submitError: '',
  isSubmitting: false,
}

describe('pickHint', () => {
  it('submitting beats everything', () => {
    const h = pickHint({ ...base, isSubmitting: true, submitError: 'boom', step1Error: 'x' })
    expect(h.mood).toBe('thinking')
    expect(h.title).toMatch(/sending/)
  })

  it('mirrors submit errors', () => {
    const h = pickHint({ ...base, step: 3, submitError: 'Phone number is required' })
    expect(h.mood).toBe('thinking')
    expect(h.sub).toBe('Phone number is required')
  })

  it('step 1 fresh asks for LinkedIn', () => {
    const h = pickHint(base)
    expect(h.mood).toBe('idle')
    expect(h.sub).toMatch(/LinkedIn/)
  })

  it('step 1 linkedin error -> pet notices the link', () => {
    const h = pickHint({ ...base, step1Error: 'LinkedIn profile link is required' })
    expect(h.mood).toBe('thinking')
    expect(h.title).toMatch(/link looks off/)
  })

  it('step 1 phone error -> pet notices the number', () => {
    const h = pickHint({ ...base, step1Error: 'Invalid phone number length' })
    expect(h.mood).toBe('thinking')
    expect(h.title).toMatch(/won't ring/)
  })

  it('step 1 focused field -> listening', () => {
    expect(pickHint({ ...base, focused: 'phone' }).mood).toBe('listening')
    expect(pickHint({ ...base, focused: 'linkedin' }).mood).toBe('listening')
  })

  it('step 1 valid -> celebrates', () => {
    const h = pickHint({ ...base, linkedinOk: true, phoneOk: true, linkedin: 'https://linkedin.com/in/x' })
    expect(h.mood).toBe('online')
    expect(h.sub).toMatch(/Continue/)
  })

  it('step 2 walks services -> niches -> experience', () => {
    expect(pickHint({ ...base, step: 2 }).sub).toMatch(/service/)
    expect(pickHint({ ...base, step: 2, servicesCount: 2 }).sub).toMatch(/lead category/)
    expect(pickHint({ ...base, step: 2, servicesCount: 2, nichesCount: 1 }).sub).toMatch(/experience/)
    const done = pickHint({ ...base, step: 2, canProceedFromStep2: true })
    expect(done.mood).toBe('online')
  })

  it('step 3 other-without-text nags for details', () => {
    const h = pickHint({ ...base, step: 3, discoverySource: 'Other', discoveryOther: '' })
    expect(h.mood).toBe('idle')
    expect(h.sub).toMatch(/type where/)
  })

  it('step 3 submittable -> smash submit', () => {
    const h = pickHint({ ...base, step: 3, discoverySource: 'Instagram', canSubmit: true })
    expect(h.mood).toBe('online')
    expect(h.title).toBe('all set')
  })
})
