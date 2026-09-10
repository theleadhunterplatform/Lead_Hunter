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

export function extractNiches(
  keyword: string | null,
  content: string,
  intelligence: string | null,
  primaryNiche?: string | null,
): string[] {
  const niches: string[] = []
  const kw = keyword ? keyword.toLowerCase().replace(/^watchlist:/, '') : ''
  const c = (content || '').toLowerCase()
  const intel = (intelligence || '').toLowerCase()
  const pNiche = (primaryNiche || '').trim().toLowerCase()

  // 1. If primaryNiche is provided, map it to relevant niche tokens
  if (pNiche) {
    niches.push(primaryNiche!.trim())
    if (pNiche.includes('web develop') || pNiche.includes('fullstack') || pNiche.includes('frontend') || pNiche.includes('backend')) {
      niches.push('Web Dev')
      niches.push('Development')
    } else if (pNiche.includes('mobile') || pNiche.includes('app develop') || pNiche.includes('software')) {
      niches.push('Development')
    } else if (pNiche.includes('ui/ux') || pNiche.includes('design') || pNiche.includes('brand')) {
      niches.push('Design')
      if (pNiche.includes('web')) niches.push('Web Design')
    } else if (pNiche.includes('paid ads') || pNiche.includes('marketing') || pNiche.includes('growth')) {
      niches.push('Marketing')
    } else if (pNiche.includes('seo')) {
      niches.push('SEO')
      niches.push('Marketing')
    } else if (pNiche.includes('copywriting') || pNiche.includes('content')) {
      niches.push('Copywriting')
    } else if (pNiche.includes('sales') || pNiche.includes('consulting') || pNiche.includes('lead gen') || pNiche.includes('strategy')) {
      niches.push('Sales & RevOps')
    } else if (pNiche.includes('ai') || pNiche.includes('automation')) {
      niches.push('AI & Automation')
    }
  }

  // 2. Map based on keyword match
  if (kw) {
    if (kw.includes('development') || kw.includes('coder') || kw.includes('software')) {
      niches.push('Development')
    }
    if (kw.includes('web dev') || kw.includes('frontend') || kw.includes('backend') || kw.includes('fullstack') || kw.includes('nextjs')) {
      niches.push('Web Dev')
      niches.push('Development')
    }
    if (kw.includes('design') || kw.includes('ui/ux') || kw.includes('figma') || kw.includes('branding')) {
      niches.push('Design')
    }
    if (kw.includes('web design')) {
      niches.push('Web Design')
      niches.push('Design')
    }
    if (kw.includes('marketing') || kw.includes('advertising') || kw.includes('ads') || kw.includes('ppc')) {
      niches.push('Marketing')
    }
    if (kw.includes('ai') || kw.includes('automation') || kw.includes('gpt') || kw.includes('agent')) {
      niches.push('AI & Automation')
    }
    if (kw.includes('seo') || kw.includes('ranking')) {
      niches.push('SEO')
      niches.push('Marketing')
    }
    if (kw.includes('copywriting') || kw.includes('writing') || kw.includes('content writer')) {
      niches.push('Copywriting')
    }
    if (kw.includes('sales') || kw.includes('revops') || kw.includes('crm') || kw.includes('pipeline')) {
      niches.push('Sales & RevOps')
    }
  }

  // 3. Fallback to keyword matching in content/intel if needed
  if (niches.length === 0) {
    if (c.includes('seo') || c.includes('search engine') || c.includes('backlink')) {
      niches.push('SEO')
      niches.push('Marketing')
    }
    if (c.includes('copywrit') || c.includes('writer') || c.includes('writing') || c.includes('content writ')) {
      niches.push('Copywriting')
    }
    if (c.includes('design') || c.includes('ui/ux') || c.includes('figma') || c.includes('landing page')) {
      niches.push('Design')
      if (c.includes('website design') || c.includes('web design')) {
        niches.push('Web Design')
      }
    }
    if (c.includes('development') || c.includes('developer') || c.includes('software') || c.includes('nextjs') || c.includes('react') || c.includes('website developer')) {
      niches.push('Development')
      if (c.includes('web dev') || c.includes('website dev') || c.includes('frontend') || c.includes('backend') || c.includes('website developer')) {
        niches.push('Web Dev')
      }
    }
    if (c.includes('marketing') || c.includes('ad campaign') || c.includes('ads ') || c.includes('lead gen')) {
      niches.push('Marketing')
    }
    if (c.includes('ai ') || c.includes('artificial intelligence') || c.includes('automation') || c.includes('n8n') || c.includes('make.com') || c.includes('zapier')) {
      niches.push('AI & Automation')
    }
    if (c.includes('sales') || c.includes('crm') || c.includes('revops') || c.includes('consulting')) {
      niches.push('Sales & RevOps')
    }
  }

  // Deduplicate and format
  const formatted = Array.from(new Set(niches))

  if (formatted.length === 0) {
    formatted.push(primaryNiche ? primaryNiche.trim() : 'General')
  }

  return formatted
}

/**
 * STRICT CONFIDENTIALITY & PII PROTECTION
 * Enforces the core rule:
 * NO person names, NO origins/sources, NO phone/WhatsApp numbers, NO emails
 * may ever be visible on unrevealed/locked cards.
 */

export function sanitizePublicText(text: string): string {
  if (!text) return ''

  return text
    // Redact emails
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi, '')
    // Redact WhatsApp numbers and labels (e.g. "whatsapp +34 690 221", "whatsapp: +1...", "wa.me/...")
    .replace(/(?:whatsapp|wa\.me|call|phone|tel|contact|reach me at|msg me at|ping me at)[\s:/-]*\+?[\d\s\-().]{5,}\d/gi, '')
    // Redact international / general phone numbers
    .replace(/(\+?\d{1,4}[\s\-]?)?(\(?\d{2,5}\)?[\s\-]?)?[\d\s\-().]{6,}\d/g, '')
    // Redact social links / usernames
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|t\.me)\/[^\s]+/gi, '')
    // Clean up trailing pipes, colons, and excessive spaces
    .replace(/\s*\|\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const VALID_SKILL_KEYWORDS: Array<{ key: string; label: string }> = [
  { key: 'woocommerce', label: 'WooCommerce' },
  { key: 'wordpress', label: 'WordPress' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'elementor', label: 'Elementor' },
  { key: 'nextjs', label: 'Next.js' },
  { key: 'next.js', label: 'Next.js' },
  { key: 'react', label: 'React' },
  { key: 'php', label: 'PHP' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'python', label: 'Python' },
  { key: 'figma', label: 'Figma' },
  { key: 'ui/ux', label: 'UI/UX' },
  { key: 'seo', label: 'SEO' },
  { key: 'b2b saas', label: 'B2B SaaS' },
  { key: 'saas', label: 'SaaS' },
  { key: 'b2b', label: 'B2B' },
  { key: 'dtc', label: 'DTC' },
  { key: 'e-commerce', label: 'E-Commerce' },
  { key: 'ecommerce', label: 'E-Commerce' },
  { key: 'automation', label: 'Automation' },
  { key: 'ai', label: 'AI' },
  { key: 'revops', label: 'RevOps' },
  { key: 'sales', label: 'Sales' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'content', label: 'Content' },
  { key: 'branding', label: 'Branding' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'outbound', label: 'Outbound' },
  { key: 'web dev', label: 'Web Dev' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'fullstack', label: 'Fullstack' },
  { key: 'consulting', label: 'Consulting' },
]

export function extractCleanNicheTags(
  post: {
    keyword?: string | null
    content?: string | null
    intelligence?: string | null
    author?: { name?: string; info?: string } | null
    platform?: string | null
  },
  leadNiches?: string[]
): string[] {
  const textCorpus = [
    post.keyword || '',
    post.content || '',
    post.intelligence || '',
    post.author?.info || '',
  ]
    .join(' ')
    .toLowerCase()

  const matchedTags: string[] = []

  for (const { key, label } of VALID_SKILL_KEYWORDS) {
    const regex = new RegExp(`\\b${key.replace('.', '\\.')}\\b`, 'i')
    if (regex.test(textCorpus)) {
      matchedTags.push(label)
    }
    if (matchedTags.length >= 3) break
  }

  if (matchedTags.length === 0 && leadNiches && leadNiches.length > 0) {
    for (const niche of leadNiches) {
      if (!matchedTags.includes(niche)) matchedTags.push(niche)
    }
  }

  if (matchedTags.length === 0) {
    matchedTags.push('B2B', 'Verified Demand')
  }

  return Array.from(new Set(matchedTags)).slice(0, 3)
}

export function sanitizeHeadline(rawTitle: string, primaryNiche?: string): string {
  if (!rawTitle || rawTitle === '--' || rawTitle === '-') {
    return `${(primaryNiche || 'SERVICE').toUpperCase()} FOR —`
  }

  let cleaned = sanitizePublicText(rawTitle)

  // Strip company affiliations like "@ Company LLC", "at Acme Corp", "at University..."
  cleaned = cleaned.replace(/@\s*[^|,\n]+/gi, '')
  cleaned = cleaned.replace(/\bat\s+[A-Z][^|,\n]+/g, '')

  // Strip trailing descriptors after pipes or commas
  if (cleaned.includes('|')) {
    cleaned = cleaned.split('|')[0].trim()
  }

  // Remove person name patterns
  const words = cleaned.split(/\s+/).filter(Boolean)
  const looksLikePersonName =
    words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z][a-z]+$/.test(w))

  if (cleaned.length < 3 || looksLikePersonName) {
    return `${(primaryNiche || 'OPPORTUNITY').toUpperCase()} FOR —`
  }

  if (!cleaned.toUpperCase().includes('FOR —') && !cleaned.toUpperCase().includes('FOR -')) {
    cleaned = `${cleaned.trim()} FOR —`
  }

  return cleaned.toUpperCase()
}
