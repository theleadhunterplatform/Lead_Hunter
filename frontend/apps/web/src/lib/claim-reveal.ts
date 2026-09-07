import type { ExternalPost } from '@/lib/external-api/client'

export function applyClaimResponseToLead(
  existing: ExternalPost,
  claimResponse: { data?: ExternalPost; success?: boolean },
): ExternalPost {
  const unlocked = claimResponse?.data
  if (!unlocked || typeof unlocked !== 'object') {
    return {
      ...existing,
      is_claimed: true,
      claimed_count: (existing.claimed_count || 0) + 1,
    }
  }

  return {
    ...existing,
    ...unlocked,
    id: unlocked.id || existing.id,
    is_claimed: true,
    claimed_count: unlocked.claimed_count ?? (existing.claimed_count || 0) + 1,
  }
}
