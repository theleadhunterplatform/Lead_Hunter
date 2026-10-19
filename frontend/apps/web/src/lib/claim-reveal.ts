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

export const VALID_NICHES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Branding & Design',
  'SEO & Organic Growth',
  'Paid Ads & Marketing',
  'Content & Copywriting',
  'Video Production & Editing',
  'AI & Automation',
  'Sales & Lead Gen',
  'Consulting & Strategy',
]

export function detectNiche(input: {
  niche?: string | null
  keyword?: string | null
  content?: string | null
  intelligence?: string | null
}): string {
  const intel = (input.intelligence || '').normalize('NFKD').toLowerCase()
  const c = (input.content || '').normalize('NFKD').toLowerCase()
  const kw = (input.keyword || '').normalize('NFKD').toLowerCase().replace(/^watchlist:[^\s]+\s*/i, '')
  const givenNiche = (input.niche || '').trim()

  // 1. Check AI Intelligence explicit niche match
  const aiNicheMatch = intel.match(/###\s*(?:🎯)?\s*niche\s*\n+([^\n#\r]+)/i)
  const candidate = aiNicheMatch && aiNicheMatch[1] ? aiNicheMatch[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim().toLowerCase() : ''

  if (candidate) {
    const found = VALID_NICHES.find((v) => v.toLowerCase() === candidate || candidate.includes(v.toLowerCase()))
    if (found) return found
  }

  // 2. High-precision cluster scan on candidate + intel + content (actual post intent beats scraper keyword!)
  const primaryText = `${candidate} ${intel} ${c}`

  // Paid Ads & Marketing (High Priority - includes social media management & creative agencies)
  if (/\b(performance marketing|paid ads|facebook ads|fb ads|meta ads|google ads|media buyer|ppc specialist|ppc agency|roas|ad campaigns?|social media marketing|social media management|social media manager|social media agency|social media|smm|d2c marketing|growth marketing|digital marketing|digital marketer|marketing agency|creative agency|creative marketing agency|brand activation|event activation|influencer (strategist|marketing|campaign|outreach)|creator campaign|creators for an upcoming|brand campaign|ugc agency)\b/i.test(primaryText)) {
    return 'Paid Ads & Marketing'
  }

  // UI/UX & Product Design
  if (/\b(ui\/ux|ui ux|ux\/ui|figma|product design(er| intern)?|ux design(er| intern)?|ui design(er| intern)?|wirefram(e|ing)|mockups?|user experience|user interface|app design(er)?|(web|website|shopify|webflow) design(er|ing)?|website redesign|landing page design(er)?|landing page redesign|redesign (our|the|a) (website|app|platform)|design system|prototyp(e|ing))\b/i.test(primaryText)) {
    return 'UI/UX Design'
  }

  // SEO & Organic Growth
  if (/\b(seo specialist|seo expert|seo agency|technical seo|on-page seo|off-page seo|backlinks?|search engine optimization|google rank(ing)?|rank on google|organic traffic|serp|link building|geo specialist|ahrefs|semrush|search console)\b/i.test(primaryText)) {
    return 'SEO & Organic Growth'
  }

  // Video Production & Editing (includes content production, reels, product shoots, photography)
  if (/\b(video edit(or|ing)?|motion graphics|reels edit(or|ing)?|reels|tiktok edit(or|ing)?|youtube edit(or|ing)?|animator|2d animat(or|ion)|3d animat(or|ion)|character animat(or|ion)|motion designer|premiere pro|after effects|video production|content production|videographer|video creator|ugc video|video thumbnail|thumbnail designer|product shoots?|photography|photographer|photoshoots?|videography|creative shoots?|scroll-stopping content)\b/i.test(primaryText)) {
    return 'Video Production & Editing'
  }

  // Branding & Graphic Design
  if (/\b(brand identity|branding agency|logo design(er)?|graphic design(er)?|packaging design|brand guidelines|visual identity|illustrat(or|ion)|brochure design|creative director|brand experience|creative agency|aesthetic photography|product photography)\b/i.test(primaryText)) {
    return 'Branding & Design'
  }

  // Content & Copywriting
  if (/\b(copywrit(er|ing)|content writ(er|ing)|technical writ(er|ing)|newsletter writ(er|ing)|ghostwrit(er|ing)|scriptwrit(er|ing)|blog writ(er|ing)|email copy(writer)?)\b/i.test(primaryText)) {
    return 'Content & Copywriting'
  }

  // Mobile Development
  if (/\b(mobile app( developer)?|ios (app|developer)|android (app|apk|developer)|apk developer|react native|flutter( developer)?|swiftui?|swift developer|kotlin developer|xcode|pos development|pos application)\b/i.test(primaryText)) {
    return 'Mobile Development'
  }

  // AI & Automation
  if (/\b(ai agent|workflow automation|n8n|zapier|make\.com|chatbot|langchain|rag|ai developer|ai automation|prompt engineer|fine-tuning llm|openai api|ai implementation|ai partners?|ai work|zoho|hubspot|crm implementation|data engineer(ing)?|scraper|scraping|data pipeline)\b/i.test(primaryText)) {
    return 'AI & Automation'
  }

  // Sales & Lead Generation
  if (/\b(lead gen(eration)?|cold outreach|appointment setter|cold email|b2b sales|b2b leads|sales rep|sdr|bdr|business development rep|lead list|apollo\.io|cold calling|telemarketing|sales executive)\b/i.test(primaryText)) {
    return 'Sales & Lead Gen'
  }

  // Web Development
  if (
    /\b(web dev(elop(er|ers|ment)?)?|website dev(elop(er|ers|ment)?)?|frontend( developer| developers)?|front-end|backend( developer| developers)?|back-end|fullstack|full-stack|next\.?js|react\.?js|react developer|vue|angular|node\.?js|express\.?js|django|flask|laravel|php developer|wordpress|elementor|divi|divibuilder|shopify|webflow|wix|squarespace|framer|html\/css|javascript developer|typescript developer|tailwind|prisma|graphql|rest api|mern|software engineer(s)?|software developer(s)?|salesforce developer|web accessibility|ontwikkelaar)\b/i.test(primaryText) ||
    (/\b(develop(er|ers|ing)?|devs?|code|coding|build|program(mer|ming)?)\b/i.test(primaryText) && /\b(website|web app|platform|portal|site|system|application)\b/i.test(primaryText))
  ) {
    return 'Web Development'
  }

  // Consulting & Strategy
  if (/\b(fractional cmo|fractional cto|business consultant|strategy consultant|advisor|accountant|accounting|bookkeeper|bookkeeping|tax filing|crm system|advisory)\b/i.test(primaryText)) {
    return 'Consulting & Strategy'
  }

  // 3. If primary text had no match, check givenNiche if valid
  if (givenNiche && VALID_NICHES.includes(givenNiche)) {
    return givenNiche
  }

  // 4. Keyword fallback
  if (kw) {
    if (/\b(performance marketing|paid ads|facebook ads|google ads|meta ads|ppc|marketing|advertising)\b/i.test(kw)) return 'Paid Ads & Marketing'
    if (/\b(ui\/ux|design|figma)\b/i.test(kw)) return 'UI/UX Design'
    if (/\b(seo)\b/i.test(kw)) return 'SEO & Organic Growth'
    if (/\b(video)\b/i.test(kw)) return 'Video Production & Editing'
    if (/\b(branding|logo)\b/i.test(kw)) return 'Branding & Design'
    if (/\b(content|copywriting|writer)\b/i.test(kw)) return 'Content & Copywriting'
    if (/\b(mobile|ios|android|flutter|react native)\b/i.test(kw)) return 'Mobile Development'
    if (/\b(ai|automation|agent)\b/i.test(kw)) return 'AI & Automation'
    if (/\b(sales|lead gen|outreach)\b/i.test(kw)) return 'Sales & Lead Gen'
    if (/\b(web|frontend|backend|developer|dev)\b/i.test(kw)) return 'Web Development'
    if (/\b(consulting|strategy)\b/i.test(kw)) return 'Consulting & Strategy'
  }

  return 'General'
}

export function extractNiches(
  keyword: string | null,
  content: string,
  intelligence: string | null,
  primaryNiche?: string | null,
): string[] {
  const niches: string[] = []
  const detected = detectNiche({
    niche: primaryNiche,
    keyword,
    content,
    intelligence,
  })

  const effectiveNiche = detected !== 'General' ? detected : (primaryNiche || 'General')
  if (effectiveNiche && effectiveNiche !== 'General') {
    niches.push(effectiveNiche)
    const pNiche = effectiveNiche.toLowerCase()
    if (pNiche.includes('web develop') || pNiche.includes('fullstack') || pNiche.includes('frontend') || pNiche.includes('backend')) {
      niches.push('Web Dev')
      niches.push('Development')
    } else if (pNiche.includes('mobile') || pNiche.includes('app develop') || pNiche.includes('software')) {
      niches.push('Development')
    } else if (pNiche.includes('ui/ux') || pNiche.includes('design') || pNiche.includes('brand')) {
      niches.push('Design')
      if (pNiche.includes('web')) niches.push('Web Design')
    } else if (pNiche.includes('paid ads') || pNiche.includes('marketing') || pNiche.includes('growth')) {
      niches.push('Paid Ads & Marketing')
      niches.push('Marketing')
    } else if (pNiche.includes('seo')) {
      niches.push('SEO')
      niches.push('Paid Ads & Marketing')
    } else if (pNiche.includes('copywriting') || pNiche.includes('content')) {
      niches.push('Copywriting')
    } else if (pNiche.includes('sales') || pNiche.includes('consulting') || pNiche.includes('lead gen') || pNiche.includes('strategy')) {
      niches.push('Sales & RevOps')
    } else if (pNiche.includes('ai') || pNiche.includes('automation')) {
      niches.push('AI & Automation')
    }
  }

  // Deduplicate and format
  const formatted = Array.from(new Set(niches))

  if (formatted.length === 0) {
    formatted.push(effectiveNiche || 'General')
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

  // Audience & Category Badges
  { key: 'international', label: 'International' },
  { key: 'national', label: 'National' },
  { key: 'agency', label: 'Agency' },
  { key: 'freelancer', label: 'Freelancer' },
  { key: 'freelance', label: 'Freelancer' },
  { key: 'hot lead', label: 'Hot Lead' },
  { key: 'google ads', label: 'Google Ads' },
  { key: 'meta ads', label: 'Meta Ads' },
  { key: 'b2b marketing', label: 'B2B Marketing' },
  { key: 'sem', label: 'SEM' },
  { key: 'video editing', label: 'Video Editing' },
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
    .replace(/^\s*[-—–*_]{2,}\s*$/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/(?:\s*[-—–*_]{2,}\s*)+/g, ' ')
    .replace(/[-—–\s]+$/, '')
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
    // Drop horizontal markdown divider lines entirely
    if (/^\s*[-—–*_]{2,}\s*$/.test(line.trim())) {
      continue
    }
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
  const sanitized = sanitizePublicText(text)
    .replace(/^#+\s*.*$/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^(?:hello everyone|hey all|hi all|we're hiring:?|hiring:?|looking for:?|#hiring)\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return stripPersonAndCompany(sanitized)
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
  const aiBadgesText = extractSection(intel, 'Badges') || extractSection(intel, 'Lead Type & Badges')
  if (aiBadgesText) {
    const parsed = aiBadgesText
      .split(/[,;\n•*]+/)
      .map((t) => t.trim().replace(/^[-*•\s]+|[-*•\s]+$/g, ''))
      .filter((t) => t.length >= 2 && t.length <= 25 && !t.toLowerCase().includes('badge'))

    if (parsed.length > 0) {
      return Array.from(new Set(parsed)).slice(0, 4)
    }
  }

  // 2. Scan text corpus against technology & audience keywords
  const textCorpus = [
    post.keyword || '',
    post.content || '',
    post.intelligence || '',
    post.author?.info || '',
  ]
    .join(' ')
    .toLowerCase()

  const matchedTags: string[] = []

  // Check for priority audience badges
  if (textCorpus.includes('urgent') || textCorpus.includes('asap') || textCorpus.includes('immediate')) {
    matchedTags.push('Hot Lead')
  }
  if (textCorpus.includes('international') || textCorpus.includes('worldwide') || textCorpus.includes('global') || textCorpus.includes('us client') || textCorpus.includes('uk client')) {
    matchedTags.push('International')
  }
  if (textCorpus.includes('agency')) {
    matchedTags.push('Agency')
  } else if (textCorpus.includes('freelancer') || textCorpus.includes('freelance') || textCorpus.includes('contractor')) {
    matchedTags.push('Freelancer')
  }

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

const PROTECTED_HEADLINE_WORDS = new Set([
  'DIGITAL', 'WEB', 'MOBILE', 'FREELANCE', 'SENIOR', 'LEAD', 'EXPERT',
  'URGENT', 'CREATIVE', 'FULL', 'STACK', 'FULL-STACK', 'AGENCY', 'PARTNER',
  'TEAM', 'HIGH', 'TICKET', 'FRONTEND', 'BACKEND', 'UI', 'UX', 'UI/UX',
  'PAID', 'ADS', 'SEO', 'CONTENT', 'VIDEO', 'AI', 'AUTOMATION', 'WORDPRESS',
  'SHOPIFY', 'REACT', 'NEXT.JS', 'APP', 'WEBSITE', 'DESIGN', 'DEVELOPMENT',
  'LAST', 'MILE', 'DELIVERY', 'SAAS', 'ECOMMERCE', 'B2B', 'COLLABORATION',
  'URGENTLY', 'ASAP', 'NEEDED', 'SPECIALIST', 'DEVELOPER', 'DESIGNER'
])

export function sanitizeHeadline(rawTitle: string, primaryNiche?: string): string {
  if (!rawTitle || rawTitle === '--' || rawTitle === '-') {
    return (primaryNiche || 'SERVICE OPPORTUNITY').toUpperCase()
  }

  let cleaned = sanitizePublicText(rawTitle)

  // Strip company affiliations like "@ Company LLC", "at Acme Corp", "at University..."
  cleaned = cleaned.replace(/@\s*[^|,\n]+/gi, '')
  cleaned = cleaned.replace(/\bat\s+[A-Z][^|,\n]+/g, '')

  // Strip trailing descriptors after pipes or commas
  if (cleaned.includes('|')) {
    cleaned = cleaned.split('|')[0].trim()
  }

  // Strip trailing "FOR —", "FOR -", "FOR", "—", "-"
  cleaned = cleaned.replace(/\s*(?:FOR\s*[—–-]|FOR|[—–-])$/i, '').trim()

  // Remove person name patterns
  const words = cleaned.split(/\s+/).filter(Boolean)
  const looksLikePersonName =
    words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z][a-z]+$/.test(w))

  // If the first word looks like an arbitrary company/brand name (e.g. PROBIZZMD), strip it unless protected
  const firstWordMatch = cleaned.match(/^([A-Za-z0-9&.\-']+)\s+(.+)$/)
  if (firstWordMatch) {
    const firstWord = firstWordMatch[1].toUpperCase()
    if (!PROTECTED_HEADLINE_WORDS.has(firstWord) && !/^(?:HOW|NEED|SEEK|WANT|LOOK|HIRE)/i.test(firstWord)) {
      cleaned = firstWordMatch[2]
    }
  }

  if (cleaned.length < 3 || looksLikePersonName) {
    return (primaryNiche || 'VERIFIED OPPORTUNITY').toUpperCase()
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
  let s = text
    // "Beyond/Beneath/On the surface-level request..."
    .replace(/^(?:beyond|beneath|on)(?:\s+the|\s+a)?\s+surface(?:-level)?(?:\s+(?:request|need|ask|inquiry))?(?:,?\s*(?:for\s+[^,]+,?)?)?\s*/i, '')
    // Redact explicit Brand: or Brand name: declarations
    .replace(/\b(?:brand(?:\s+name)?|company(?:\s+name)?)\s*:\s*[A-Za-z0-9&'._\-]+/gi, '')

  // 1. Education Institutions (School, University, College, Academy)
  s = s.replace(/^[A-Z][a-zA-Z0-9&.\-']+(?:\s+[A-Z][a-zA-Z0-9&.\-']+){0,3}\s+(?:World\s+School|School|University|College|Institute|Academy)\s+(?:seeks?|is\s+seeking|needs?|is\s+looking\s+for|is\s+hiring|requires?)\s+(?:an?\s+)?/i, 'An educational institution seeks ')

  // 2. Founder / Executive: "Nikhil, founder of Dcatzoon, needs..."
  s = s.replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:co-)?(?:founder|ceo|owner|director|head|lead|manager)\s+of\s+[A-Z0-9&.\-']+(?:\s+[A-Z0-9&.\-']+)?,\s*(?:needs?|seeks?|is\s+looking\s+for|is\s+seeking|requires?)\s+(?:an?\s+)?/i, 'A startup founder needs ')

  // 3. Person Name: "Thouseef Iqbal is looking for..."
  s = s.replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\s+(?:is\s+looking\s+for|is\s+seeking|is\s+hiring)\s+(?:an?\s+)?/i, 'A business founder is looking for ')
  s = s.replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\s+(?:seeks?|needs?|requires?|wants?)\s+(?:an?\s+)?/i, 'A business client seeks ')

  // 4. App / Product / Brand with descriptor: "SARO, a womenswear label, needs..."
  s = s.replace(/^[A-Z0-9&.\-']+(?:\s+[A-Z0-9&.\-']+){0,2},\s*(an?|the)\s+([a-zA-Z0-9\s\-]+?),\s*(?:needs?|seeks?|is\s+looking\s+for|is\s+seeking|requires?)\s+(?:an?\s+)?/i, (m, art, desc) => {
    return `${art.charAt(0).toUpperCase() + art.slice(1).toLowerCase()} ${desc} needs `
  })

  // 5. Tech/AI entity: "DPRS AI seeks...", "ProBizzMD is looking for..."
  s = s.replace(/^[A-Z0-9&.\-']+(?:\s+AI)?\s+(?:is\s+looking\s+for|is\s+seeking)\s+(?:an?\s+)?/i, 'A digital platform is looking for ')
  s = s.replace(/^[A-Z0-9&.\-']+(?:\s+AI)?\s+(?:seeks?|needs?|requires?)\s+(?:an?\s+)?/i, 'A business client seeks ')

  // 6. Generic Company / Entity: "Happy Traveller seeks..."
  s = s.replace(/^[A-Z][a-zA-Z0-9&.\-']+(?:\s+[A-Z][a-zA-Z0-9&.\-']+){0,2}\s+(?:seeks?|needs?|requires?)\s+(?:an?\s+)?/i, 'A business client seeks ')
  s = s.replace(/^[A-Z][a-zA-Z0-9&.\-']+(?:\s+[A-Z][a-zA-Z0-9&.\-']+){0,2}\s+(?:is\s+looking\s+for|is\s+seeking)\s+(?:an?\s+)?/i, 'A business client is looking for ')

  // Secondary product mention: e.g. "OneApp requires a design system"
  s = s.replace(/\bOneApp\s+requires\b/gi, 'The platform requires')

  return s
    // "BRAND is a/an/the..." -> "A/an/the..." (e.g. "GLAMSTORY is a women's fashion and footwear brand." -> "A women's fashion and footwear brand.")
    .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+is\s+(an?|the)\s+/i, (m, art) => `${art.charAt(0).toUpperCase() + art.slice(1).toLowerCase()} `)
    // "BRAND is [verb/gerund]..." -> "A business [verb/gerund]..."
    .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+is\s+(operating|expanding|launching|seeking|building|growing)\b/i, 'A business $1')
    // "BRAND, an? [description]..." -> "An? [description]..."
    .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3},\s+(an?\s+[^,]+)/i, (m, desc) => `${desc.charAt(0).toUpperCase() + desc.slice(1)}`)
    // "BRAND specializes in / sells / focuses on..." -> "Client specializes in / sells..."
    .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+(specializes\s+in|sells|focuses\s+on|operates\s+in|provides)\b/i, 'Client $1')
    // Possessive proper nouns: "BRAND's brand / store / platform..." -> "The client's brand / store / platform..."
    .replace(/^(?!(?:a|an|the|our)\s+)(?!(?:women|men|children|founder|client|customer|user|author|member|everyone)'s\b)[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,2}'s\s+/i, "The client's ")
    // "Agroloka Commodity seeks/needs/requires/hires/is looking for..." -> "Client seeks "
    .replace(/^[A-Z][a-zA-Z0-9&.\-']+(?:\s+[A-Z][a-zA-Z0-9&.\-']+){0,3}\s+(?:seeks|requires|needs|wants|hires|is\s+seeking|is\s+looking\s+for|is\s+hiring|is\s+needing)\s+(?:an?\s+)?/i, 'Client seeks ')
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
    // Mask specific corporate legal entity registrations (Pvt Ltd, LLC, Inc, Corp, GmbH, LLP) without touching words like Agency, Media, Solutions, Studios
    .replace(/\b[A-Z][a-zA-Z0-9&.\-']+(?:\s+[A-Z][a-zA-Z0-9&.\-']+){0,2}\s+(?:Pvt\.?\s*Ltd\.?|Ltd\.?|LLC|Inc\.?|Corp\.?|GmbH|LLP)\b/g, '')
    // "The client/founder/post is looking for..."
    .replace(/^(?:the\s+)?(?:client|author|user|agency|buyer|company|founder|post)\s+(?:is\s+)?(?:actively\s+)?(?:hiring|looking\s+for|seeking|needs|requires|wants)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:looking\s+for|seeking|needs|requires|wants)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:we\s+are|we're|i\s+am|i'm)\s+(?:actively\s+)?(?:hiring|looking\s+for|seeking|needing)\s+(?:an?\s+)?/i, '')
    .replace(/^(?:on\s+the\s+surface,?\s*(?:they\s+want\s+)?)/i, '')
    .trim()
}

export function sanitizeBuyerPersona(text: string): string {
  if (!text) return ''
  let s = text.trim()
  s = s.replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+is\s+(an?|the)\s+/i, (m, art) => `${art.charAt(0).toUpperCase() + art.slice(1).toLowerCase()} `)
  s = s.replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+is\s+(operating|expanding|launching|seeking|building|growing)\b/i, 'A business $1')
  s = s.replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3},\s+(an?\s+[^,]+)/i, (m, desc) => `${desc.charAt(0).toUpperCase() + desc.slice(1)}`)
  s = s.replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+(specializes\s+in|sells|focuses\s+on|operates\s+in|provides)\b/i, 'Client $1')
  s = s.replace(/^(?!(?:a|an|the|our)\s+)(?!(?:women|men|children|founder|client|customer|user|author|member|everyone)'s\b)[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,2}'s\s+/i, "The client's ")
  s = s.replace(/\b(?:brand(?:\s+name)?|company(?:\s+name)?)\s*:\s*[A-Za-z0-9&'._\-]+/gi, '')
  s = stripPersonAndCompany(s)
  if (s && s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return s
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

  // Extract first complete sentence ending in . ? or ! (avoiding decimal points like 3.5x or abbreviations like e.g.)
  const match = cleaned.match(/^((?:[^.?!]|\.(?=\d)|\.(?<=\b[A-Za-z]\.))+[.?!])/)
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

export function extractBuyerPersona(intel: string, industryFallback?: string | null): string {
  if (!intel) return industryFallback ? `${industryFallback} Brand / Client` : 'Client seeking specialized execution partner.'

  // 1. Scan Context bullets for persona
  const contextMatch = intel.match(/##\s*🧩\s*Context You Might Miss\s*\n+([\s\S]*?)(?=\n##|---|$)/i)
  if (contextMatch) {
    const lines = contextMatch[1].split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const clean = line.replace(/^[-*•\s]+/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim()
      if (/founder|agency|brand|company|startup|merchant|client|business|store|retailer|manager|owner|lead/i.test(clean)) {
        if (!/email\s+domain|geographic|location/i.test(clean)) {
          // Strip meta commentary: "Buyer persona is likely a marketing manager or brand owner" -> "Marketing manager or brand owner"
          let p = clean
            .replace(/^(?:buyer\s+)?persona\s+is\s+(?:likely\s+)?(?:an?\s+)?/i, '')
            .replace(/^(?:the\s+)?buyer\s+is\s+(?:likely\s+)?(?:an?\s+)?/i, '')
            .replace(/^(?:target\s+)?buyer\s*(?:profile|type)?\s*:\s*/i, '')
            .replace(/^(?:an?\s+)?likely\s+/i, '')
            .replace(/[.?!]+$/, '')
            .trim()
          if (p.length > 0) {
            p = p.charAt(0).toUpperCase() + p.slice(1)
          }
          if (p.length >= 4) {
            return p
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
      return sanitizeBuyerPersona(cleanCompleteSentence(founderMatch[0]))
    }
    const agencyMatch = text.match(/([A-Za-z\s]+?(?:agency|firm|network|brand|startup))\s+is\s+(?:actively\s+)?hiring/i)
    if (agencyMatch) {
      return sanitizeBuyerPersona(cleanCompleteSentence(agencyMatch[1] + ' expanding operations'))
    }
  }

  return 'Verified business client in active growth phase'
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

  // 1. Role: Concise professional role title (NEVER a full sentence starting with "Client seeks...")
  let rawRole =
    findBody(/ideal candidate/i) ||
    lead.role ||
    ''

  let role = ''
  let cleanRole = rawRole.trim()
    .replace(/^(?:client\s+seeks|client\s+is\s+seeking|seeking|looking\s+for|needs?|requires?|hiring|we\s+need|i\s+need|urgent)\s+(?:an?\s+)?/i, '')
    .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+(?:seeks|is\s+seeking|is\s+looking\s+for|needs)\s+(?:an?\s+)?/i, '')
    .replace(/(?:\s+needed|\s+wanted|\s+required|\s+urgent|\s+to\s+join|\s+for\s+startup)[.!]?$/i, '')
    .replace(/[.?!]+$/, '')
    .trim()

  const forMatch = cleanRole.match(/^([A-Za-z\s/-]{3,30}?)\s+for\s+([A-Za-z\s/-]{3,40})/i)
  if (forMatch) {
    const mainRole = forMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
    const spec = forMatch[2].trim().replace(/\b\w/g, (c) => c.toUpperCase())
    role = `${mainRole} (${spec})`
  } else if (cleanRole.length >= 3 && cleanRole.length <= 50 && !cleanRole.includes('.')) {
    role = cleanRole.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (!role) {
    const specialty = extractLeadSpecialty(lead)
    role = (specialty && specialty !== 'OPPORTUNITY' && specialty !== 'GENERAL') ? specialty : (lead.category || 'Specialized Execution Partner')
  }
  if (!role || role.toLowerCase() === 'general' || role === '--') {
    role = 'Specialized Execution Partner'
  }

  // 2. Task: Concrete scope of deliverables (NEVER repeating Role or "Client seeks...")
  let task = ''
  const coreScope = findBody(/core scope/i)
  const twoLine = findBody(/2[\s-]?line/i)
  const fourLine = findBody(/4[\s-]?line/i)
  const textSource = twoLine || fourLine || lead.detailsSummary || lead.taskScope || lead.summary || ''

  const sentences = textSource.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean)
  let deliverable = ''

  for (const s of sentences) {
    if (/scope\s+includes|deliverables?\s+include/i.test(s)) {
      deliverable = s.replace(/^(?:the\s+)?(?:scope|deliverables?)\s+(?:includes?|are|entails?)\s+/i, '')
      break
    }
  }

  if (!deliverable && sentences[0]) {
    deliverable = sentences[0]
      .replace(/^[A-Z0-9&'._\-]+(?:\s+[A-Z0-9&'._\-]+){0,3}\s+(?:is\s+)?(?:seeking|looking\s+for|hiring|needs?)\s+(?:an?\s+)?[^,.]+?\s+to\s+/i, '')
      .replace(/^(?:client\s+seeks|seeking|looking\s+for|hiring|needs?)\s+(?:an?\s+)?[^,.]+?\s+to\s+/i, '')
      .replace(/^(?:client\s+seeks|seeking|looking\s+for|hiring|needs?)\s+(?:an?\s+)?/i, '')
  }

  if (sentences[1] && /shoots|photography|reels|testing|roas|design|build|manage|scale|audit|report/i.test(sentences[1])) {
    const s2Clean = sentences[1].replace(/^(?:the\s+)?(?:scope\s+includes|objective\s+is\s+to)\s+/i, '').replace(/[.?!]+$/, '')
    if (!deliverable.toLowerCase().includes(s2Clean.toLowerCase().slice(0, 15))) {
      deliverable = `${deliverable.replace(/[.?!]+$/, '')}, ${s2Clean}`
    }
  }

  task = cleanCompleteSentence(deliverable || coreScope || lead.taskScope || 'Project delivery, system integration & execution.')

  // Deduplication check: if task repeats role or title, fall back to core deliverables
  if (task.toLowerCase().includes(role.toLowerCase()) && task.length < 40) {
    task = cleanCompleteSentence(coreScope || lead.detailsSummary || lead.taskScope || 'Project delivery, system integration & execution.')
  }

  // 3. Must Have: Requirements, tools, creative skills, portfolio (NEVER repeating role or task)
  let mustHave = ''
  const reqMatch = intel.match(/##\s*🎯\s*What They Actually Want\s*\n+([\s\S]*?)(?=\n##|---|$)/i)
  if (reqMatch) {
    const bullets = reqMatch[1]
      .split(/\n+/)
      .map((b) => b.replace(/^[-*•\s\d.]+\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim())
      .filter((b) => b.length > 5 && !/^[A-Z0-9\s:_-]{1,15}$/.test(b))

    const roleWords = role.toLowerCase().split(/[\s()/]+/).filter((w) => w.length > 3)
    const uniqueBullet = bullets.find((b) => {
      const bLower = b.toLowerCase()
      const matchCount = roleWords.filter((w) => bLower.includes(w)).length
      return matchCount === 0
    })

    if (uniqueBullet) {
      mustHave = uniqueBullet
    } else if (bullets.length > 1) {
      mustHave = bullets[1]
    } else if (bullets.length > 0) {
      mustHave = bullets[0]
    }
  }

  // Fallback to Context nuance or nicheTags if still empty or duplicates role/task
  const roleLower = role.toLowerCase()
  const taskLower = task.toLowerCase()
  if (!mustHave || mustHave.toLowerCase() === roleLower || taskLower.includes(mustHave.toLowerCase())) {
    const contextBody = intel.match(/##\s*🧩\s*Context You Might Miss\s*\n+([\s\S]*?)(?=\n##|---|$)/i)?.[1] || ''
    const contextBullets = contextBody
      .split(/\n+/)
      .map((b) => b.replace(/^[-*•\s\d.]+\s*/, '').trim())
      .filter((b) => /nuance|need|requirement|portfolio|experience|skills|creative|track record/i.test(b))
    if (contextBullets.length > 0) {
      mustHave = contextBullets[0].replace(/^project\s+nuance\s+is\s+(?:the\s+)?/i, '')
    } else if (lead.nicheTags && lead.nicheTags.length > 0) {
      const skills = lead.nicheTags.filter((t) => !['International', 'National', 'Agency', 'Freelancer', 'Hot Lead'].includes(t))
      if (skills.length > 0) {
        mustHave = `Expertise in ${skills.slice(0, 4).join(', ')} with proven track record.`
      }
    }
  }
  mustHave = cleanCompleteSentence(mustHave || lead.mustHave || 'Proven domain expertise, portfolio, and independent execution.')

  // 4. Niche: Clean badges / tags list
  const badges = extractLeadBadges(
    {
      keyword: lead.category,
      content: lead.taskScope || lead.summary,
      intelligence: lead.buyerType,
    },
    lead.niches || []
  )
  const niche = badges.length > 0 ? badges.slice(0, 3).join(', ') : 'Development, Growth'

  // 5. Buyer: Commercial entity & decision maker profile
  let buyer = extractBuyerPersona(intel, lead.category)

  // Detect industry if not already present in buyer string
  const indMatch =
    lead.signalContext?.match(/category:\s*([A-Za-z\s&-]+)/i)?.[1] ||
    intel.match(/(?:A|An)\s+([A-Za-z0-9\s&-]{3,35}?(?:brand|company|startup|firm|store|retailer|merchant))/i)?.[1] ||
    lead.summary?.match(/(?:A|An)\s+([A-Za-z0-9\s&-]{3,35}?(?:brand|company|startup|firm|store|retailer|merchant))/i)?.[1]

  if (indMatch && !buyer.toLowerCase().includes(indMatch.toLowerCase().trim())) {
    const cleanInd = indMatch.trim().replace(/^[a-z]/, (c) => c.toUpperCase())
    if (!/^(?:a\s+)?(?:business|client|company|store|brand)(?:\s+(?:client|business))?$/i.test(cleanInd)) {
      buyer = `${cleanInd} (${buyer})`
    }
  }

  // Deduplicate any repeated consecutive words or phrases in buyer (e.g. "A business client a business client")
  buyer = buyer.replace(/\b([A-Za-z\s]{3,25}?)\s+\1\b/gi, '$1').trim()

  return {
    role: role || 'Specialized Execution Partner',
    task: task || 'Project delivery, platform setup, and implementation',
    mustHave: mustHave || 'Relevant industry experience, proven execution, portfolio',
    niche: niche || 'General',
    buyer: buyer || 'Verified commercial client in active growth phase',
  }
}

/**
 * Extracts a concise 2-4 word target specialty title (Line 1 before Role, e.g. "Ecommerce Platform Developer").
 */
export function extractLeadSpecialty(lead: {
  role?: string | null
  category?: string | null
  niche?: string | null
  keyword?: string | null
  buyerType?: string | null
  signalContext?: string | null
  content?: string | null
}): string {
  // 1. Clean and check lead.role (handles "Experienced Performance Marketing Freelancer needed.")
  if (lead.role && !/^(general|--)$/i.test(lead.role.trim())) {
    let cleanRole = lead.role
      .replace(/(?:\s+needed|\s+wanted|\s+required|\s+urgent|\s+to\s+join|\s+for\s+startup)[.!]?$/i, '')
      .replace(/^(?:client\s+seeks|seeking|looking\s+for|hiring|needs?)\s+(?:an?\s+)?/i, '')
      .replace(/^["'`*#]+|["'`*#]+$/g, '')
      .replace(/[.?!]+$/, '')
      .trim()
    // If it has "for social media management" or "to build...", strip to the core role noun phrase
    const forMatch = cleanRole.match(/^([A-Za-z\s/-]{3,35}?)\s+(?:for|to)\s+/i)
    if (forMatch) {
      cleanRole = forMatch[1].trim()
    }
    if (cleanRole.length >= 3 && cleanRole.length <= 45 && !cleanRole.toLowerCase().includes('watchlist:')) {
      return cleanRole.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  const intel = (lead.buyerType || '').normalize('NFKD')
  const oneLiner = intel.match(/###\s*🧠\s*One-Liner\s*\n+([^#\n]+)/i)?.[1] || ''
  const match = oneLiner.match(
    /(?:seeking|looking\s+for|hiring|needs?)\s+(?:an?\s+)?([A-Za-z\s/-]{3,55}?(?:developer|engineer|specialist|agency|partner|expert|designer|freelancer|manager|firm|team|intern|marketer))/i,
  )
  if (match) {
    const raw = match[1].trim()
    if (raw.length >= 3 && raw.length <= 60 && !raw.toLowerCase().includes('watchlist:')) {
      return raw.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  // Content direct role extraction (matches "We're Hiring: Role" or "Looking for Role")
  const rawText = ((lead.signalContext || lead.content || '') as string).normalize('NFKD')
  const contentMatch =
    rawText.match(
      /(?:we[’']re\s+hiring|we\s+are\s+hiring|hiring|looking\s+for|seeking)\s*:\s*([A-Za-z0-9\s/|-]{3,55}?(?:developer|engineer|specialist|agency|partner|expert|designer|intern|lead|manager|consultant|freelancer|marketer))/i,
    ) ||
    rawText.match(
      /(?:looking\s+for|seeking|hiring)\s+(?:an?\s+)?([A-Za-z\s/-]{3,55}?(?:developer|engineer|specialist|agency|partner|expert|designer|intern|consultant|freelancer|marketer))/i,
    )
  if (contentMatch) {
    const raw = contentMatch[1].trim().replace(/^[:\s|\-]+|[:\s|\-]+$/g, '').trim()
    if (raw.length >= 3 && raw.length <= 60 && !raw.toLowerCase().includes('watchlist:')) {
      return raw.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  // 2. High-precision detected niche fallback to prevent scraper query overriding content
  const detected = detectNiche({
    niche: lead.niche,
    keyword: lead.category,
    content: lead.signalContext || lead.content,
    intelligence: lead.buyerType,
  })

  if (detected && detected !== 'General') {
    return detected
  }

  if (lead.category && !/^(general|--)$/i.test(lead.category)) {
    const catLower = lead.category.toLowerCase()
    if (!catLower.startsWith('watchlist:') && !catLower.includes('needed') && !catLower.includes('wanted')) {
      return lead.category
    }
  }

  return lead.niche || 'Specialist Partner'
}

/**
 * Extracts the clean executive 1-sentence summary hook (Line 3 before Role).
 */
export function extractLeadOneLiner(intel: string, summaryFallback?: string | null): string {
  if (!intel && !summaryFallback) return ''
  const sec = intel.match(/###\s*🧠\s*One-Liner\s*\n+([^#\n]+)/i)
  if (sec && sec[1]) {
    return cleanCompleteSentence(sec[1])
  }
  if (summaryFallback) {
    return cleanCompleteSentence(summaryFallback)
  }
  return ''
}
