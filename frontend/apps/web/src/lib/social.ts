/**
 * Social media link normalization and anti-abuse deduplication utilities.
 */

export function normalizeSocialUrl(rawUrl?: string | null): string {
  if (!rawUrl) return ''
  let clean = rawUrl.trim()
  if (!clean) return ''

  // If input doesn't start with http/https, prepend https:// to parse URL safely
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`
  }

  try {
    const parsed = new URL(clean)
    let hostname = parsed.hostname.toLowerCase()

    // Strip www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    // Map x.com to twitter.com for unified handle/URL deduplication
    if (hostname === 'x.com') {
      hostname = 'twitter.com'
    }

    // Lowercase and strip trailing slashes from pathname
    let pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '')

    // If pathname is empty, just return hostname
    if (!pathname || pathname === '/') {
      return hostname
    }

    return `${hostname}${pathname}`
  } catch {
    // Fallback if URL constructor fails on malformed input
    return clean
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
  }
}

/**
 * Checks whether a given social URL represents a real individual profile/page
 * rather than a generic root homepage or feed (e.g. "linkedin.com", "linkedin.com/feed").
 */
export function isValidSocialProfile(rawUrl?: string | null): boolean {
  if (!rawUrl) return false
  const normalized = normalizeSocialUrl(rawUrl)
  if (!normalized) return false

  const genericRoots = [
    'linkedin.com',
    'linkedin.com/feed',
    'linkedin.com/in',
    'twitter.com',
    'twitter.com/home',
    'x.com',
    'x.com/home',
    'instagram.com',
    'github.com',
    'dribbble.com',
    'behance.net',
  ]

  if (genericRoots.includes(normalized)) {
    return false
  }

  // If it's a LinkedIn link, it must contain a profile path or handle
  if (normalized.startsWith('linkedin.com') && !normalized.startsWith('linkedin.com/in/') && !normalized.startsWith('linkedin.com/company/')) {
    // Has to have at least a path segment beyond root
    const parts = normalized.split('/')
    if (parts.length < 2 || !parts[1].trim()) return false
  }

  return true
}
