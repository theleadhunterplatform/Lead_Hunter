export function isFullyVerifiedEmailStatus(status?: string | null): boolean {
  if (!status) return false
  return status.toLowerCase() === 'verified'
}

export function formatVerifiedByLabel(verifiedBy?: string[] | null): string | null {
  if (!verifiedBy?.length) return null
  const hasCompass = verifiedBy.includes('Contact Compass')
  const hasHunter = verifiedBy.includes('Hunter.io')
  if (hasCompass && hasHunter) return 'Verified by: Contact Compass & Hunter.io'
  if (hasCompass) return 'Verified by: Contact Compass Only'
  if (hasHunter) return 'Verified by: Hunter.io Only'
  return null
}

export function getEmailStatusBadge(
  status?: string,
  source?: string,
): { label: string; className: string } {
  if (status === 'invalid') {
    return { label: 'Invalid', className: 'bg-red-500/10 text-red-400 border-red-500/30' }
  }
  if (isFullyVerifiedEmailStatus(status)) {
    return { label: 'Verified', className: 'bg-green-500/10 text-green-400 border-green-500/30' }
  }
  if (status === 'guessed' || source === 'pattern_guess') {
    return { label: 'Guessed', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' }
  }
  return { label: 'Unverified', className: 'bg-white/5 text-text-secondary border-white/10' }
}
