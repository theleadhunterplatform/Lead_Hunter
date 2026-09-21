import { describe, it, expect } from 'vitest'
import {
  LEAD_REVEAL_COSTS,
  getRevealCost,
  leadContactBundle,
  getLeadRevealCost,
} from '@/lib/config/coins'
import type { ExternalPost } from '@/lib/external-api/client'

function makePost(overrides: Partial<ExternalPost>): ExternalPost {
  return {
    id: 'lead-1',
    post_id: 'post-1',
    url: '',
    content: '',
    platform: 'linkedin',
    author: { name: 'Jane' },
    posted_at: { date: '', timestamp: 0, postedAgoText: '', postedAgoShort: '' },
    engagement: { likes: 0, comments: 0, shares: 0 },
    keyword: null,
    keyword_id: null,
    status: 'approved',
    source: '',
    image_url: null,
    ai_score: 0,
    is_training_data: false,
    is_deleted: false,
    email: null,
    contact_info: null,
    source_type: '',
    source_profile: '',
    qualification_reason: null,
    enrichment_status: '',
    enrichment_message: null,
    enriched_at: null,
    intelligence: null,
    review_status: 'approved',
    reviewed_at: null,
    reviewed_by_id: null,
    reviewed_by_name: null,
    is_claimed: false,
    claimed_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('getRevealCost', () => {
  it('charges 10 for phone + email (highest value wins)', () => {
    expect(getRevealCost({ hasPhone: true, hasEmail: true, hasProfileLink: true })).toBe(
      LEAD_REVEAL_COSTS.phone_email,
    )
    expect(getRevealCost({ hasPhone: true, hasEmail: true, hasProfileLink: false })).toBe(10)
  })

  it('charges 8 for phone only', () => {
    expect(getRevealCost({ hasPhone: true, hasEmail: false, hasProfileLink: false })).toBe(8)
  })

  it('charges 5 for email only', () => {
    expect(getRevealCost({ hasPhone: false, hasEmail: true, hasProfileLink: true })).toBe(5)
  })

  it('charges 2 for profile link only', () => {
    expect(getRevealCost({ hasPhone: false, hasEmail: false, hasProfileLink: true })).toBe(2)
  })

  it('returns null when no contact data at all', () => {
    expect(getRevealCost({ hasPhone: false, hasEmail: false, hasProfileLink: false })).toBeNull()
  })

  it('resolves phone-only rule over profile link', () => {
    expect(getRevealCost({ hasPhone: true, hasEmail: false, hasProfileLink: true })).toBe(8)
  })

  it('resolves email-only rule over profile link', () => {
    expect(getRevealCost({ hasPhone: false, hasEmail: true, hasProfileLink: false })).toBe(5)
  })
})

describe('leadContactBundle', () => {
  it('detects phone from contact_info.phone_numbers', () => {
    const bundle = leadContactBundle(
      makePost({ contact_info: { name: 'Jane', emails: [], phone_numbers: [{ number: '+1' }] } }),
    )
    expect(bundle.hasPhone).toBe(true)
    expect(bundle.hasEmail).toBe(false)
    expect(bundle.hasProfileLink).toBe(false)
  })

  it('detects email from top-level email field', () => {
    const bundle = leadContactBundle(makePost({ email: 'jane@example.com' }))
    expect(bundle.hasEmail).toBe(true)
  })

  it('detects email from contact_info.emails', () => {
    const bundle = leadContactBundle(
      makePost({ contact_info: { name: 'Jane', emails: [{ email: 'jane@example.com' }], phone_numbers: [] } }),
    )
    expect(bundle.hasEmail).toBe(true)
  })

  it('detects profile link from linkedin_public_id', () => {
    const bundle = leadContactBundle(
      makePost({ contact_info: { name: 'Jane', emails: [], phone_numbers: [], linkedin_public_id: 'jane-doe' } }),
    )
    expect(bundle.hasProfileLink).toBe(true)
  })

  it('detects profile link from author.url', () => {
    const bundle = leadContactBundle(makePost({ author: { name: 'Jane', url: 'https://x.com/jane' } }))
    expect(bundle.hasProfileLink).toBe(true)
  })

  it('returns all false for empty lead', () => {
    const bundle = leadContactBundle(makePost({}))
    expect(bundle).toEqual({ hasPhone: false, hasEmail: false, hasProfileLink: false })
  })
})

describe('getLeadRevealCost', () => {
  it('returns 10 for a phone+email lead', () => {
    const cost = getLeadRevealCost(
      makePost({
        email: 'jane@example.com',
        contact_info: { name: 'Jane', emails: [], phone_numbers: [{ number: '+1' }] },
      }),
    )
    expect(cost).toBe(10)
  })

  it('returns null for a lead with no contact data', () => {
    expect(getLeadRevealCost(makePost({}))).toBeNull()
  })
})