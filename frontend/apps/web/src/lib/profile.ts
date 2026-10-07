/**
 * Profile & socials editing helpers for the settings profile editor.
 *
 * Field rules mirror `onboardingSchema` (lib/validators/auth.ts) and the
 * `hasCompletedOnboarding` gate (lib/auth.ts): the gate requires
 * phone + linkedin + servicesOffered + preferredLeadCategories +
 * outreachExperience + discoverySource, and ClientLayout redirects users who
 * fail it back to /onboarding (whose POST resets status to PENDING). So those
 * fields may be EDITED here but never cleared to empty; the remaining social
 * links are optional and freely clearable.
 */

import { db } from '@/lib/db'
import { normalizeSocialUrl, isValidSocialProfile } from '@/lib/social'

export const PROFILE_SOCIAL_FIELDS = [
  'linkedin',
  'portfolio',
  'website',
  'twitter',
  'instagram',
  'github',
  'dribbble',
  'behance',
] as const

export type ProfileSocialField = (typeof PROFILE_SOCIAL_FIELDS)[number]

export const PROFILE_TEXT_FIELDS = ['outreachExperience', 'discoverySource'] as const
export const PROFILE_ARRAY_FIELDS = ['servicesOffered', 'preferredLeadCategories'] as const

/** Social links the user may clear (null). `linkedin` is gate-critical. */
const CLEARABLE_SOCIAL_FIELDS = new Set<ProfileSocialField>([
  'portfolio',
  'website',
  'twitter',
  'instagram',
  'github',
  'dribbble',
  'behance',
])

const MAX_URL_LEN = 500
const MAX_TEXT_LEN = 1000
const MAX_ARRAY_ITEMS = 25
const MAX_ARRAY_ITEM_LEN = 80

const SOCIAL_LABELS: Record<ProfileSocialField, string> = {
  linkedin: 'LinkedIn profile link',
  portfolio: 'Portfolio link',
  website: 'Website link',
  twitter: 'X/Twitter link',
  instagram: 'Instagram link',
  github: 'GitHub link',
  dribbble: 'Dribbble link',
  behance: 'Behance link',
}

const ARRAY_LABELS: Record<(typeof PROFILE_ARRAY_FIELDS)[number], string> = {
  servicesOffered: 'Services offered',
  preferredLeadCategories: 'Preferred lead categories',
}

const LINKEDIN_REQUIRED_MESSAGE =
  'Please provide a valid direct link to your personal or company LinkedIn profile (e.g. linkedin.com/in/yourname)'

export type ProfileParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: string; message: string }

function invalid(message: string): ProfileParseResult {
  return { ok: false, code: 'VALIDATION_ERROR', message }
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key)
}

/**
 * Validates the profile-editable subset of a PATCH /api/auth/me body.
 * Returns only the keys that were present in the body (absent keys are left
 * untouched by the caller). Privileged fields (role, status, plan, email,
 * credits, phone...) are never read here, so they cannot be escalated.
 */
export function parseProfilePatch(body: Record<string, unknown>): ProfileParseResult {
  const data: Record<string, unknown> = {}

  for (const field of PROFILE_SOCIAL_FIELDS) {
    if (!has(body, field)) continue
    const raw = body[field]

    if (raw === null || raw === undefined || raw === '') {
      if (CLEARABLE_SOCIAL_FIELDS.has(field)) {
        data[field] = null
        continue
      }
      return invalid(`${SOCIAL_LABELS[field]} is required for your profile.`)
    }

    if (typeof raw !== 'string') {
      return invalid(`${SOCIAL_LABELS[field]} must be text.`)
    }

    const value = raw.trim()
    if (!value) {
      if (CLEARABLE_SOCIAL_FIELDS.has(field)) {
        data[field] = null
        continue
      }
      return invalid(`${SOCIAL_LABELS[field]} is required for your profile.`)
    }
    if (value.length > MAX_URL_LEN) {
      return invalid(`${SOCIAL_LABELS[field]} must be ${MAX_URL_LEN} characters or fewer.`)
    }
    if (!isValidSocialProfile(value)) {
      return {
        ok: false,
        code: 'INVALID_SOCIAL_LINK',
        message:
          field === 'linkedin'
            ? LINKEDIN_REQUIRED_MESSAGE
            : `Please provide a valid direct link to your ${SOCIAL_LABELS[field].toLowerCase()} (e.g. ${field}.com/yourname)`,
      }
    }
    data[field] = value
  }

  for (const field of PROFILE_TEXT_FIELDS) {
    if (!has(body, field)) continue
    const raw = body[field]

    if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) {
      return invalid(`${field === 'outreachExperience' ? 'Outreach experience' : 'Discovery source'} is required for your profile.`)
    }
    if (typeof raw !== 'string') {
      return invalid('Profile text fields must be text.')
    }
    const value = raw.trim()
    if (value.length > MAX_TEXT_LEN) {
      return invalid(`Profile text must be ${MAX_TEXT_LEN} characters or fewer.`)
    }
    data[field] = value
  }

  for (const field of PROFILE_ARRAY_FIELDS) {
    if (!has(body, field)) continue
    const raw = body[field]

    if (!Array.isArray(raw)) {
      return invalid(`${ARRAY_LABELS[field]} must be a list.`)
    }

    const items: string[] = []
    for (const item of raw) {
      if (typeof item !== 'string') {
        return invalid(`${ARRAY_LABELS[field]} entries must be text.`)
      }
      const value = item.trim()
      if (!value) continue
      if (value.length > MAX_ARRAY_ITEM_LEN) {
        return invalid(`${ARRAY_LABELS[field]} entries must be ${MAX_ARRAY_ITEM_LEN} characters or fewer.`)
      }
      if (!items.includes(value)) items.push(value)
    }

    if (items.length === 0) {
      return invalid(`Select at least one ${ARRAY_LABELS[field].toLowerCase()}.`)
    }
    if (items.length > MAX_ARRAY_ITEMS) {
      return invalid(`${ARRAY_LABELS[field]} supports up to ${MAX_ARRAY_ITEMS} entries.`)
    }
    data[field] = items
  }

  return { ok: true, data }
}

/**
 * Anti-abuse: true when any social link being set (normalized) is already
 * linked by ANOTHER account. Mirrors the duplicate check in
 * POST /api/onboarding (same search conditions + in-memory normalization),
 * excluding the user's own row so re-saving unchanged values never trips it.
 */
export async function findDuplicateSocialLink(
  uid: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const normalizedInputs = new Set<string>()
  const searchConditions: Array<Record<string, unknown>> = []

  for (const field of PROFILE_SOCIAL_FIELDS) {
    const val = data[field]
    if (typeof val !== 'string' || !val.trim()) continue
    const norm = normalizeSocialUrl(val)
    if (norm && isValidSocialProfile(val)) {
      normalizedInputs.add(norm)
      searchConditions.push(
        { [field]: val.trim() },
        { [field]: norm },
        { [field]: `https://${norm}` },
        { [field]: { contains: norm, mode: 'insensitive' } },
      )
    }
  }

  if (normalizedInputs.size === 0) return false

  const candidates = await db.user.findMany({
    where: {
      id: { not: uid },
      OR: searchConditions as never,
    },
    select: {
      id: true,
      linkedin: true,
      portfolio: true,
      website: true,
      twitter: true,
      instagram: true,
      github: true,
      dribbble: true,
      behance: true,
    },
  })

  return candidates.some((candidate) => {
    for (const field of PROFILE_SOCIAL_FIELDS) {
      const candidateVal = candidate[field]
      if (typeof candidateVal === 'string' && candidateVal.trim()) {
        const candidateNorm = normalizeSocialUrl(candidateVal)
        if (candidateNorm && normalizedInputs.has(candidateNorm)) return true
      }
    }
    return false
  })
}

/** Shape of the profile fields returned by GET/PATCH /api/auth/me. */
export function profilePayload(user: {
  city?: string | null
  portfolio?: string | null
  website?: string | null
  linkedin?: string | null
  instagram?: string | null
  dribbble?: string | null
  behance?: string | null
  github?: string | null
  twitter?: string | null
  servicesOffered?: string[] | null
  preferredLeadCategories?: string[] | null
  outreachExperience?: string | null
  discoverySource?: string | null
}) {
  return {
    city: user.city || null,
    portfolio: user.portfolio || null,
    website: user.website || null,
    linkedin: user.linkedin || null,
    instagram: user.instagram || null,
    dribbble: user.dribbble || null,
    behance: user.behance || null,
    github: user.github || null,
    twitter: user.twitter || null,
    servicesOffered: user.servicesOffered ?? [],
    preferredLeadCategories: user.preferredLeadCategories ?? [],
    outreachExperience: user.outreachExperience || null,
    discoverySource: user.discoverySource || null,
  }
}
