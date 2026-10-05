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

export const VALID_SKILL_KEYWORDS: Array<{ key: string; label: string }> = [
  // Modern Frontend & Fullstack
  { key: 'next.js', label: 'Next.js' },
  { key: 'nextjs', label: 'Next.js' },
  { key: 'react native', label: 'React Native' },
  { key: 'react', label: 'React' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'tailwind', label: 'Tailwind CSS' },
  { key: 'vue', label: 'Vue.js' },
  { key: 'angular', label: 'Angular' },
  { key: 'html/css', label: 'HTML/CSS' },
  { key: 'redux', label: 'Redux' },

  // Backend & Databases
  { key: 'node.js', label: 'Node.js' },
  { key: 'nodejs', label: 'Node.js' },
  { key: 'node', label: 'Node.js' },
  { key: 'express', label: 'Express' },
  { key: 'mongodb', label: 'MongoDB' },
  { key: 'mongo', label: 'MongoDB' },
  { key: 'postgres', label: 'PostgreSQL' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'mysql', label: 'MySQL' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'firebase', label: 'Firebase' },
  { key: 'graphql', label: 'GraphQL' },
  { key: 'rest api', label: 'REST API' },
  { key: 'prisma', label: 'Prisma' },

  // CMS & E-Commerce
  { key: 'wordpress', label: 'WordPress' },
  { key: 'woocommerce', label: 'WooCommerce' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'elementor', label: 'Elementor' },
  { key: 'webflow', label: 'Webflow' },
  { key: 'wix', label: 'Wix' },
  { key: 'squarespace', label: 'Squarespace' },
  { key: 'magento', label: 'Magento' },

  // Languages & Frameworks
  { key: 'python', label: 'Python' },
  { key: 'django', label: 'Django' },
  { key: 'fastapi', label: 'FastAPI' },
  { key: 'php', label: 'PHP' },
  { key: 'laravel', label: 'Laravel' },
  { key: 'flutter', label: 'Flutter' },
  { key: 'swift', label: 'Swift' },
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
  { key: 'docker', label: 'Docker' },
  { key: 'aws', label: 'AWS' },

  // Design, SEO, & Growth
  { key: 'figma', label: 'Figma' },
  { key: 'ui/ux', label: 'UI/UX' },
  { key: 'ui ux', label: 'UI/UX' },
  { key: 'seo', label: 'SEO' },
  { key: 'b2b saas', label: 'B2B SaaS' },
  { key: 'saas', label: 'SaaS' },
  { key: 'automation', label: 'Automation' },
  { key: 'ai', label: 'AI' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'branding', label: 'Branding' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'consulting', label: 'Consulting' },
]

export function extractSection(text: string, heading: string): string {
  if (!text) return ''
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`#+\\s*[^\\n]*?${escaped}[^\\n]*?\\n+([\\s\\S]*?)(?:\\n#+\\s|---|\$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].replace(/^[\\s\-*#—]+|[\\s\-*#—]+$/g, '').trim() : ''
}

export interface IntelSection {
  label: string
  body: string
}

/** Strip markdown decoration from an AI intel section body. */
export function cleanIntelBody(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a markdown-style AI intelligence blob into ordered labeled sections.
 * Tolerates emoji glued to heading markers (`##📋 2-Line Summary`), headings
 * that ended up mid-line after punctuation, and `## ##` doubling.
 */
export function parseIntelSections(intel: string): IntelSection[] {
  if (!intel || !intel.trim()) return []

  const normalized = intel
    .replace(/\r\n?/g, '\n')
    // Headings glued after punctuation: "development. ##📋 2-Line Summary"
    .replace(/([.!?:;])[ \t]*(#{1,6}[ \t]*)/g, '$1\n$2')
    // Headings glued after plain whitespace: "development ### Requirements"
    .replace(/[ \t]+(#{1,6}[ \t]+)/g, '\n$1')

  const lines = normalized.split('\n')
  const sections: IntelSection[] = []
  let label: string | null = null
  let buf: string[] = []

  const flush = () => {
    if (label !== null) {
      const cleanLabel = label
        .replace(/[#*`_]/g, ' ')
        .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
      const body = cleanIntelBody(buf.join('\n'))
      // Headings are short; reject false positives like "#hiring looking for..."
      if (cleanLabel && body && label.length <= 80) {
        sections.push({ label: cleanLabel, body })
      }
    }
    label = null
    buf = []
  }

  for (const line of lines) {
    const match = line.match(/^\s*#{1,6}\s*(.+?)\s*$/)
    if (match && match[1].length <= 80) {
      flush()
      label = match[1]
    } else if (label !== null) {
      buf.push(line)
    }
  }
  flush()

  return sections
}

export function cleanLeadSummary(text: string): string {
  if (!text) return ''
  return sanitizePublicText(text)
    .replace(/^#+\s*.*$/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^(?:hello everyone|hey all|hi all|we're hiring:?|hiring:?|looking for:?|#hiring)\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function extractLeadBadges(
  post: {
    keyword?: string | null
    content?: string | null
    intelligence?: string | null
    author?: { name?: string; info?: string } | null
    platform?: string | null
  },
  leadNiches?: string[]
): string[] {
  const intel = post.intelligence || ''

  // 1. Check if AI intelligence provided an explicit Badges section
  const aiBadgesText = extractSection(intel, 'Badges')
  if (aiBadgesText) {
    const parsed = aiBadgesText
      .split(/[,;\n•*]+/)
      .map((t) => t.trim().replace(/^[-*•\s]+|[-*•\s]+$/g, ''))
      .filter((t) => t.length >= 2 && t.length <= 25 && !t.toLowerCase().includes('badge'))

    if (parsed.length > 0) {
      return Array.from(new Set(parsed)).slice(0, 4)
    }
  }

  // 2. Scan text corpus against our 50+ technology keywords
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
    if (regex.test(textCorpus) && !matchedTags.includes(label)) {
      matchedTags.push(label)
    }
    if (matchedTags.length >= 4) break
  }

  // 3. Fallback to lead niches if tech tags are empty
  if (matchedTags.length === 0 && leadNiches && leadNiches.length > 0) {
    for (const niche of leadNiches) {
      if (!matchedTags.includes(niche)) matchedTags.push(niche)
    }
  }

  if (matchedTags.length === 0) {
    matchedTags.push('Verified Demand')
  }

  return Array.from(new Set(matchedTags)).slice(0, 4)
}

export function extractLeadSummaries(post: {
  content?: string | null
  intelligence?: string | null
  author?: { name?: string; info?: string } | null
}): { summary: string; detailsSummary: string } {
  const intel = post.intelligence || ''
  const content = post.content || ''

  // 1. Extract 4-line summary or general summary first
  let detailsSummaryRaw =
    extractSection(intel, '4-Line Summary') ||
    extractSection(intel, 'Four-Line Summary') ||
    extractSection(intel, 'Post Summary') ||
    ''

  let cardSummaryRaw =
    extractSection(intel, '2-Line Summary') ||
    extractSection(intel, 'Two-Line Summary') ||
    extractSection(intel, 'One-Liner') ||
    ''

  let detailsSummary = cleanLeadSummary(detailsSummaryRaw)
  let cardSummary = cleanLeadSummary(cardSummaryRaw)

  if (!detailsSummary) {
    const generalSummary = extractSection(intel, 'Summary')
    if (generalSummary) {
      detailsSummary = cleanLeadSummary(generalSummary)
    } else {
      const oneLiner = extractSection(intel, 'One-Liner')
      const whatTheyWant = extractSection(intel, 'What They Actually Want')
      const context = extractSection(intel, 'Context You Might Miss')

      const parts = [oneLiner, whatTheyWant, context].filter(Boolean)
      if (parts.length > 0) {
        detailsSummary = cleanLeadSummary(parts.join(' '))
      }
    }
  }

  // 2. Ensure continuity: the 2-line summary MUST be the exact first 2 sentences of the 4-line summary
  if (detailsSummary) {
    const detailSentences = detailsSummary.split(/(?<=[.?!])\s+/).filter(Boolean)
    if (detailSentences.length >= 2) {
      cardSummary = detailSentences.slice(0, 2).join(' ')
    } else {
      cardSummary = detailsSummary
    }
  } else if (cardSummary) {
    // If detailsSummary is empty, use cardSummary as base and continue with additional context
    const context = cleanLeadSummary(
      extractSection(intel, 'What They Actually Want') ||
      extractSection(intel, 'Context You Might Miss') ||
      content
    )
    if (context) {
      const moreSentences = context.split(/(?<=[.?!])\s+/).filter(Boolean).slice(0, 2).join(' ')
      detailsSummary = `${cardSummary} ${moreSentences}`.trim()
    } else {
      detailsSummary = cardSummary
    }
  } else if (content) {
    const cleaned = cleanLeadSummary(content)
    const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(Boolean)
    cardSummary = sentences.slice(0, 2).join(' ') || cleaned.slice(0, 160)
    detailsSummary = sentences.slice(0, 4).join(' ') || cleaned.slice(0, 320)
  }

  return {
    summary: cardSummary,
    detailsSummary: detailsSummary || cardSummary,
  }
}

// Backward-compatible alias for existing imports
export const extractCleanNicheTags = extractLeadBadges

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

export interface StructuredLeadDetails {
  role: string
  task: string
  mustHave: string
  niche: string
  buyer: string
}

export function stripPersonAndCompany(text: string): string {
  if (!text) return ''
  return text
    // "Beyond/Beneath/On the surface-level request..."
    .replace(/^(?:beyond|beneath|on)(?:\s+the|\s+a)?\s+surface(?:-level)?(?:\s+(?:request|need|ask|inquiry))?(?:,?\s*(?:for\s+[^,]+,?)?)?\s*/i, '')
    // "John Doe, Esq. / MBA is actively seeking..."
    .replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}(?:,\s*(?:Esq\.?|MBA|PhD|[A-Za-z\s]+))?\s+(?:is\s+)?(?:actively\s+)?(?:seeking|looking\s+for|hiring|needing)\s+(?:an?\s+)?/i, '')
    // "John Doe from/at Acme is actively seeking..."
    .replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}(?:\s+(?:from|at)\s+[A-Za-z0-9\s]+?)?\s+(?:is\s+)?(?:actively\s+)?(?:seeking|looking\s+for|hiring|needing)\s+(?:an?\s+)?/i, '')
    // "Company Name, a digital agency actively seeking..." -> "Seeking..."
    .replace(/^[A-Z][a-zA-Z0-9\s]+?,\s*(?:an?\s+)?[a-zA-Z0-9\s\-]+?\s+(?:actively\s+)?(?:seeking|looking\s+for|hiring|needing)\s+(?:an?\s+)?/i, '')
    // "Company Name is actively hiring..."
    .replace(/^[A-Z][a-zA-Z0-9\s]+?\s+is\s+(?:actively\s+)?(?:hiring|looking\s+for|seeking|needing)\s+(?:an?\s+)?/i, '')
    // Possessive person names: "Guna Rajendran's company is likely in a growth phase..." -> "Company in a growth phase..."
    .replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}'s\s+(company|brand|startup|firm|team|business)\s+(?:is\s+)?(?:likely\s+)?(?:in\s+)?/i, 'Company in ')
    // "The client/founder/post is looking for..."
    .replace(/^(?:the\s+)?(?:client|author|user|agency|buyer|company|founder|post)\s+(?:is\s+)?(?:actively\s+)?(?:hiring|looking\s+for|seeking|needs|requires|wants)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:looking\s+for|seeking|needs|requires|wants)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:we\s+are|we're|i\s+am|i'm)\s+(?:actively\s+)?(?:hiring|looking\s+for|seeking|needing)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:on\s+the\s+surface,?\s*(?:they\s+want\s+)?)/i, '')
    .trim()
}

/**
 * Returns a clean, grammatically complete sentence (no mid-sentence ellipsis truncation).
 * Kept short and punchy so it fits comfortably in drawer/cards without vertical scroll.
 */
export function cleanCompleteSentence(text: string): string {
  if (!text) return ''

  const s = sanitizePublicText(text)

  // Pick first substantive line or bullet
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let first = lines[0] || s
  for (const line of lines) {
    const clean = line.replace(/^[-*•#\d.]+\s*/, '').trim()
    if (clean.length > 6) {
      first = clean
      break
    }
  }

  // Remove markdown formatting
  let cleaned = first
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^[-*•#\s]+/, '')
    .trim()

  // Strip preambles and person/company prefixes
  cleaned = stripPersonAndCompany(cleaned)

  // Extract first complete sentence ending in . ? or !
  const match = cleaned.match(/^([^.?!]+[.?!])/)
  let sentence = match ? match[1].trim() : cleaned.trim()

  // Remove meta commentary or trailing filler clauses
  sentence = sentence
    .replace(/,\s*(?:presenting\s+(?:an?\s+)?(?:opportunity|chance)|rather\s+than\s+just|which\s+(?:means|creates|allows)|signaling|indicating)\s+.*$/i, '.')
    .replace(/[,;:\-\s]+$/, '')
    .trim()

  // Ensure sentence ends cleanly with a period if not already punctuated
  if (sentence && !/[.?!]$/.test(sentence)) {
    sentence += '.'
  }

  // Capitalize first character
  if (sentence.length > 0) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1)
  }

  return sentence
}

export function toConciseField(text: string): string {
  return cleanCompleteSentence(text)
}

export function extractIntelTitle(intel: string): string {
  const match = intel.match(/#+\s*(?:🔥\s*)?Lead\s+Intelligence:\s*([^#\r\n]+)/i)
  return match ? match[1].trim() : ''
}

export function extractBuyerPersona(intel: string): string {
  if (!intel) return 'Client seeking specialized execution partner.'

  // 1. Scan Context bullets for persona
  const contextMatch = intel.match(/##\s*🧩\s*Context You Might Miss\s*\n+([\s\S]*?)(?=\n##|---|$)/i)
  if (contextMatch) {
    const lines = contextMatch[1].split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const clean = line.replace(/^[-*•\s]+/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim()
      if (/founder|agency|brand|company|startup|merchant|client|business/i.test(clean)) {
        if (!/email\s+domain|geographic|location/i.test(clean)) {
          const sentence = cleanCompleteSentence(clean)
          if (sentence && sentence.length >= 15) {
            return sentence
          }
        }
      }
    }
  }

  // 2. Fallback to One-Liner buyer extraction
  const oneLinerMatch = intel.match(/###\s*🧠\s*One-Liner\s*\n+([^#\n]+)/i)
  if (oneLinerMatch) {
    const text = oneLinerMatch[1].trim()
    const founderMatch = text.match(/^(?:a\s+)?(founder|agency|business\s+owner|company|brand|startup)[^,.]*(?:with|seeking|looking|operating)[^,.]*/i)
    if (founderMatch) {
      return cleanCompleteSentence(founderMatch[0])
    }
    const agencyMatch = text.match(/([A-Za-z\s]+?(?:agency|firm|network|brand|startup))\s+is\s+(?:actively\s+)?hiring/i)
    if (agencyMatch) {
      return cleanCompleteSentence(agencyMatch[1] + ' expanding operations')
    }
  }

  return 'Verified company in active growth phase seeking execution partner.'
}

export function getStructuredLeadDetails(lead: {
  role?: string | null
  taskScope?: string | null
  mustHave?: string | null
  buyerType?: string | null
  category?: string | null
  niche?: string | null
  niches?: string[] | null
  summary?: string | null
  detailsSummary?: string | null
  signalContext?: string | null
}): StructuredLeadDetails {
  const intel = lead.buyerType || ''
  const parsedSections = parseIntelSections(intel)
  const intelTitle = extractIntelTitle(intel)

  const findBody = (pattern: RegExp): string => {
    const found = parsedSections.find((s) => pattern.test(s.label))
    return found ? found.body : ''
  }

  // 1. Role: Ideal candidate or one-liner or role (clean complete sentence)
  let rawRole =
    findBody(/ideal candidate/i) ||
    findBody(/one[\s-]?liner/i) ||
    lead.role ||
    ''
  let role = cleanCompleteSentence(rawRole)
  if (!role || role.toLowerCase() === 'general' || role.length < 5 || /^[\d\s]+followers$/i.test(role) || role === '--') {
    const fb = lead.category && lead.category.toLowerCase() !== 'general' ? lead.category : ''
    role = fb ? `${fb} Specialist` : cleanCompleteSentence(lead.summary || '')
  }
  if (!role) {
    role = 'Specialized Developer / Growth Partner'
  }

  // 2. Task: Prefer AI intel title or Core Scope or taskScope (clean title or complete sentence)
  let task = ''
  if (intelTitle && intelTitle.length >= 6 && intelTitle.length <= 80) {
    task = intelTitle
  } else {
    let rawTask =
      findBody(/core scope/i) ||
      lead.taskScope ||
      findBody(/2[\s-]?line/i) ||
      lead.summary ||
      ''
    task = cleanCompleteSentence(rawTask)
  }
  if (!task) {
    task = 'Project delivery, system integration & execution'
  }

  // 3. Must Have: What They Actually Want or Requirements (clean complete sentence)
  let rawMustHave =
    findBody(/what they actually want/i) ||
    findBody(/requirements/i) ||
    lead.mustHave ||
    ''
  let mustHave = cleanCompleteSentence(rawMustHave)
  if (!mustHave) {
    mustHave = 'Proven domain expertise, portfolio, and independent execution.'
  }

  // 4. Niche: Clean badges / tags list (comma-separated badges)
  const badges = extractLeadBadges(
    {
      keyword: lead.category,
      content: lead.taskScope || lead.summary,
      intelligence: lead.buyerType,
    },
    lead.niches || []
  )
  const niche = badges.length > 0 ? badges.slice(0, 3).join(', ') : 'Development, Growth'

  // 5. Buyer: Target buyer profile (clean complete sentence)
  let buyer = extractBuyerPersona(intel)

  return {
    role: role || 'Specialized Developer / Agency Partner',
    task: task || 'Project delivery, platform setup, and implementation',
    mustHave: mustHave || 'Relevant industry experience, proven execution, portfolio',
    niche: niche || 'General',
    buyer: buyer || 'Verified client looking for specialized service provider',
  }
}
