import type { ExternalPost } from '@/lib/external-api/client'

/**
 * Value-based lead reveal pricing (Work Item 7).
 * Cost depends on what contact data a lead actually has, resolved by the
 * highest-value rule when multiple are present.
 */
export const LEAD_REVEAL_COSTS = {
  phone_only: 8,
  email_only: 5,
  phone_email: 10,
  profile_only: 2,
} as const

export interface ContactBundle {
  hasPhone: boolean
  hasEmail: boolean
  hasProfileLink: boolean
}

/**
 * Classifies the contact data available on a lead at claim time.
 * - Phone: any phone number in contact_info.
 * - Email: top-level email OR any email in contact_info.
 * - Profile link: LinkedIn public id, author url, or any social url in contact info.
 */
export function leadContactBundle(
  lead: Pick<ExternalPost, 'email' | 'contact_info' | 'author'>,
): ContactBundle {
  const hasPhone = (lead.contact_info?.phone_numbers?.length ?? 0) > 0
  const hasEmail = !!lead.email || (lead.contact_info?.emails?.length ?? 0) > 0
  const hasProfileLink =
    !!lead.contact_info?.linkedin_public_id || !!lead.author?.url

  return { hasPhone, hasEmail, hasProfileLink }
}

/**
 * Returns the reveal cost in coins given a contact bundle, or `null` when the
 * lead has no contact data (reveal must be blocked).
 *
 * Resolution order (highest-value rule wins):
 * (phone & email → 10) > (phone only → 8) > (email only → 5) > (profile only → 2).
 */
export function getRevealCost(bundle: ContactBundle): number | null {
  const { hasPhone, hasEmail, hasProfileLink } = bundle
  if (hasPhone && hasEmail) return LEAD_REVEAL_COSTS.phone_email
  if (hasPhone) return LEAD_REVEAL_COSTS.phone_only
  if (hasEmail) return LEAD_REVEAL_COSTS.email_only
  if (hasProfileLink) return LEAD_REVEAL_COSTS.profile_only
  return null
}

/** Convenience wrapper that computes cost directly from an ExternalPost. */
export function getLeadRevealCost(lead: Parameters<typeof leadContactBundle>[0]): number | null {
  return getRevealCost(leadContactBundle(lead))
}