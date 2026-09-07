/**
 * Merge claim API response into a list lead so contacts unlock immediately.
 */
export function applyClaimResponseToLead<T extends Record<string, any>>(
  existing: T,
  claimResponse: { data?: any; success?: boolean } | any
): T {
  const unlocked = claimResponse?.data ?? claimResponse;
  if (!unlocked || typeof unlocked !== "object") {
    return {
      ...existing,
      is_claimed: true,
      claimed_count: (existing.claimed_count || 0) + 1,
    };
  }

  return {
    ...existing,
    ...unlocked,
    _id: unlocked._id || unlocked.id || existing._id,
    is_claimed: true,
    claimed_count:
      unlocked.claimed_count ?? (existing.claimed_count || 0) + 1,
  };
}
