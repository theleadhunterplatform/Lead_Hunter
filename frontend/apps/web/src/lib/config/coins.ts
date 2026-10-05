import type { ExternalPost } from '@/lib/external-api/client'

/**
 * Value-based lead reveal pricing (Work Item 7).
 * Cost depends on what contact data a lead actually has, resolved by the
 * highest-value rule when multiple are present.
 */
export const LEAD_REVEAL_COSTS = {
  phone_only: 12,
  email_only: 10,
  phone_email: 15,
  profile_only: 5,
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
 * (phone & email → 15) > (phone only → 12) > (email only → 10) > (profile only → 5).
 */
export function getRevealCost(bundle: ContactBundle): number | null {
  const { hasPhone, hasEmail, hasProfileLink } = bundle
  if (hasPhone && hasEmail) return LEAD_REVEAL_COSTS.phone_email
  if (hasPhone) return LEAD_REVEAL_COSTS.phone_only
  if (hasEmail) return LEAD_REVEAL_COSTS.email_only
  if (hasProfileLink) return LEAD_REVEAL_COSTS.profile_only
  return null
}

/**
 * Convenience wrapper that computes cost directly from an ExternalPost.
 * If a custom credit cost (`credit_cost` or `creditCost`) is set on the lead,
 * it overrides the default contact-bundle-based cost and is returned directly.
 */
export function getLeadRevealCost(
  lead: Parameters<typeof leadContactBundle>[0] & {
    credit_cost?: number | null
    creditCost?: number | null
  },
): number | null {
  const manualCost = lead.credit_cost ?? lead.creditCost
  if (typeof manualCost === 'number' && manualCost >= 0) {
    return manualCost
  }
  return getRevealCost(leadContactBundle(lead))
}