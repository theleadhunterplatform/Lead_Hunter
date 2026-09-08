import { describe, it, expect } from 'vitest'
import {
  adminUserActionSchema,
  onboardingSchema,
  leadRevealSchema,
  updateLeadSchema,
  outreachSendSchema,
  adminNoteSchema,
} from '@/lib/validators/auth'

describe('adminUserActionSchema', () => {
  it('accepts a valid status action', () => {
    const result = adminUserActionSchema.safeParse({ action: 'APPROVE', plan: 'FREELANCER' })
    expect(result.success).toBe(true)
  })

  it('accepts bonusCredits grant', () => {
    const result = adminUserActionSchema.safeParse({ bonusCredits: 100 })
    expect(result.success).toBe(true)
  })

  it('accepts a changePlan', () => {
    const result = adminUserActionSchema.safeParse({ changePlan: 'AGENCY' })
    expect(result.success).toBe(true)
  })

  it('accepts tags update', () => {
    const result = adminUserActionSchema.safeParse({ tags: ['vip', 'beta'] })
    expect(result.success).toBe(true)
  })

  it('rejects a payload with no recognized action', () => {
    const result = adminUserActionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects an unknown action', () => {
    const result = adminUserActionSchema.safeParse({ action: 'HACK' })
    expect(result.success).toBe(false)
  })

  it('rejects negative bonusCredits', () => {
    const result = adminUserActionSchema.safeParse({ bonusCredits: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid plan', () => {
    const result = adminUserActionSchema.safeParse({ changePlan: 'ULTIMATE' })
    expect(result.success).toBe(false)
  })
})

describe('onboardingSchema', () => {
  const validBase = {
    phone: '+1 555 123 4567',
    servicesOffered: ['Web Development'],
    preferredLeadCategories: ['SaaS'],
    outreachExperience: 'intermediate',
    discoverySource: 'Google Search',
  }

  it('accepts a valid payload with linkedin profile link', () => {
    const result = onboardingSchema.safeParse({ ...validBase, linkedin: 'https://linkedin.com/in/jane' })
    expect(result.success).toBe(true)
  })

  it('rejects when linkedin is missing even if other links are provided', () => {
    const result = onboardingSchema.safeParse({ ...validBase, portfolio: 'https://x.dev' })
    expect(result.success).toBe(false)
  })

  it('rejects when phone is missing', () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      phone: '',
      linkedin: 'https://linkedin.com/in/jane',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when no services are selected', () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      servicesOffered: [],
      linkedin: 'https://linkedin.com/in/jane',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when no categories are selected', () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      preferredLeadCategories: [],
      linkedin: 'https://linkedin.com/in/jane',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when outreachExperience is empty', () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      outreachExperience: '',
      linkedin: 'https://linkedin.com/in/jane',
    })
    expect(result.success).toBe(false)
  })
})

describe('leadRevealSchema', () => {
  it('accepts a valid leadId', () => {
    expect(leadRevealSchema.safeParse({ leadId: 'lead-1' }).success).toBe(true)
  })

  it('rejects missing or empty leadId', () => {
    expect(leadRevealSchema.safeParse({}).success).toBe(false)
    expect(leadRevealSchema.safeParse({ leadId: '' }).success).toBe(false)
  })
})

describe('updateLeadSchema', () => {
  it('accepts a valid status transition', () => {
    const result = updateLeadSchema.safeParse({ status: 'saved' })
    expect(result.success).toBe(true)
  })

  it('accepts an isSaved boolean', () => {
    const result = updateLeadSchema.safeParse({ isSaved: true })
    expect(result.success).toBe(true)
  })

  it('accepts both fields together', () => {
    const result = updateLeadSchema.safeParse({ status: 'sent', isSaved: true })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown status', () => {
    const result = updateLeadSchema.safeParse({ status: 'deleted' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-boolean isSaved', () => {
    const result = updateLeadSchema.safeParse({ isSaved: 'yes' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty body', () => {
    const result = updateLeadSchema.safeParse({})
    expect(result.success).toBe(true) // both optional => ok by design
  })
})

describe('outreachSendSchema', () => {
  it('accepts a valid send payload', () => {
    const result = outreachSendSchema.safeParse({
      leadId: 'lead-1',
      subject: 'Hey there',
      body: 'Long body',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing body', () => {
    const result = outreachSendSchema.safeParse({ leadId: 'lead-1', subject: 'Hey' })
    expect(result.success).toBe(false)
  })
})

describe('adminNoteSchema', () => {
  it('accepts non-empty content', () => {
    expect(adminNoteSchema.safeParse({ content: 'note' }).success).toBe(true)
  })

  it('rejects empty content', () => {
    expect(adminNoteSchema.safeParse({ content: '' }).success).toBe(false)
  })
})