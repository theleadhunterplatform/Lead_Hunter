'use client'

import React from 'react'

interface NicheBadgeProps {
  niche?: string | null
  keyword?: string | null
  content?: string | null
  intelligence?: string | null
  className?: string
  size?: 'xs' | 'sm'
}

const NICHE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Web Development': {
    bg: 'bg-[#08283b]',
    text: 'text-cyan-300',
    border: 'border-cyan-400/40',
    icon: '💻',
  },
  'Mobile Development': {
    bg: 'bg-[#0a2342]',
    text: 'text-blue-300',
    border: 'border-blue-400/40',
    icon: '📱',
  },
  'UI/UX Design': {
    bg: 'bg-[#211138]',
    text: 'text-purple-200',
    border: 'border-purple-400/40',
    icon: '🎨',
  },
  'Branding & Design': {
    bg: 'bg-[#290e2e]',
    text: 'text-fuchsia-200',
    border: 'border-fuchsia-400/40',
    icon: '✨',
  },
  'SEO & Organic Growth': {
    bg: 'bg-[#082a1e]',
    text: 'text-emerald-300',
    border: 'border-emerald-400/40',
    icon: '📈',
  },
  'Paid Ads & Marketing': {
    bg: 'bg-[#08272b]',
    text: 'text-teal-200',
    border: 'border-teal-400/40',
    icon: '🎯',
  },
  'Content & Copywriting': {
    bg: 'bg-[#2b1f09]',
    text: 'text-amber-300',
    border: 'border-amber-400/40',
    icon: '✍️',
  },
  'Video Production & Editing': {
    bg: 'bg-[#2d0e1b]',
    text: 'text-rose-300',
    border: 'border-rose-400/40',
    icon: '🎬',
  },
  'Sales & Lead Gen': {
    bg: 'bg-[#2e1608]',
    text: 'text-orange-300',
    border: 'border-orange-400/40',
    icon: '⚡',
  },
  'AI & Automation': {
    bg: 'bg-[#1b1238]',
    text: 'text-violet-200',
    border: 'border-violet-400/40',
    icon: '🤖',
  },
  'Consulting & Strategy': {
    bg: 'bg-[#121638]',
    text: 'text-indigo-200',
    border: 'border-indigo-400/40',
    icon: '💼',
  },
  'General': {
    bg: 'bg-[#181a20]',
    text: 'text-zinc-300',
    border: 'border-zinc-500/30',
    icon: '🎯',
  },
}

const DEFAULT_STYLE = {
  bg: 'bg-white/[0.06]',
  text: 'text-text-secondary',
  border: 'border-white/10',
  icon: '🏷️',
}

function resolveNiche(
  niche?: string | null,
  keyword?: string | null,
  content?: string | null,
  intelligence?: string | null,
): string {
  // 1. If an explicit verified niche exists in NICHE_STYLES, trust it immediately
  if (niche && niche.trim() && NICHE_STYLES[niche.trim()]) {
    return niche.trim()
  }

  const kw = (keyword || '').normalize('NFKD').toLowerCase().replace(/^watchlist:[^\s]+\s*/i, '')
  const c = (content || '').normalize('NFKD').toLowerCase()
  const intel = (intelligence || '').normalize('NFKD').toLowerCase()

  // 2. Check if AI Intelligence output has an explicit Niche line
  const aiNicheMatch = intel.match(/###\s*(?:🎯)?\s*niche\s*\n+([^\n#\r]+)/i)
  if (aiNicheMatch) {
    const raw = aiNicheMatch[1].trim()
    const found = Object.keys(NICHE_STYLES).find(
      (k) => k.toLowerCase() === raw.toLowerCase() || raw.toLowerCase().includes(k.toLowerCase()),
    )
    if (found && found !== 'General') return found
  }

  const primaryText = `${c} ${intel}`.trim() || kw
  const fullText = `${kw} ${primaryText}`

  // 3. UI/UX & Product Design (checked early so design roles aren't stolen by web/video keywords)
  if (
    /\b(ui\/ux|ui ux|ux\/ui|figma|product design(er| intern)?|ux design(er| intern)?|ui design(er| intern)?|wirefram(e|ing)|mockups?|user experience|user interface|app design(er)?|(web|website|shopify|webflow) design(er|ing)?|website redesign|landing page design(er)?|landing page redesign|redesign (our|the|a) (website|app|platform)|design system|prototyp(e|ing))\b/i.test(
      fullText,
    )
  ) {
    return 'UI/UX Design'
  }

  // 4. SEO & Organic Growth
  if (
    /\b(seo specialist|seo expert|seo agency|technical seo|on-page seo|off-page seo|backlinks?|search engine optimization|google rank(ing)?|rank on google|organic traffic|serp|link building|geo specialist|ahrefs|semrush|search console)\b/i.test(
      fullText,
    )
  ) {
    return 'SEO & Organic Growth'
  }

  // 5. Video Production & Editing
  if (
    /\b(video edit(or|ing)?|motion graphics|reels edit(or|ing)?|tiktok edit(or|ing)?|youtube edit(or|ing)?|animator|2d animat(or|ion)|3d animat(or|ion)|character animat(or|ion)|motion designer|premiere pro|after effects|video production|videographer|video creator|ugc video|video thumbnail|thumbnail designer)\b/i.test(
      fullText,
    )
  ) {
    return 'Video Production & Editing'
  }

  // 6. Branding & Graphic Design
  if (
    /\b(brand identity|branding agency|logo design(er)?|graphic design(er)?|packaging design|brand guidelines|visual identity|illustrat(or|ion)|brochure design|creative director|brand experience)\b/i.test(
      fullText,
    )
  ) {
    return 'Branding & Design'
  }

  // 7. Copywriting & Content
  if (
    /\b(copywrit(er|ing)|content writ(er|ing)|technical writ(er|ing)|newsletter writ(er|ing)|ghostwrit(er|ing)|scriptwrit(er|ing)|blog writ(er|ing)|email copy(writer)?)\b/i.test(
      fullText,
    )
  ) {
    return 'Content & Copywriting'
  }

  // 8. Paid Ads & Performance Marketing
  if (
    /\b(performance marketing|paid ads|facebook ads|fb ads|meta ads|google ads|media buyer|ppc specialist|ppc agency|roas|ad campaigns?|social media marketing|smm|d2c marketing|growth marketing|digital marketing|digital marketer|marketing agency|creative marketing agency|brand activation|event activation|influencer (strategist|marketing|campaign|outreach)|creator campaign|creators for an upcoming|brand campaign|ugc agency)\b/i.test(
      fullText,
    )
  ) {
    return 'Paid Ads & Marketing'
  }

  // 9. Mobile Development
  if (
    /\b(mobile app( developer)?|ios (app|developer)|android (app|apk|developer)|apk developer|react native|flutter( developer)?|swiftui?|swift developer|kotlin developer|xcode|pos development|pos application)\b/i.test(
      fullText,
    )
  ) {
    return 'Mobile Development'
  }

  // 10. AI & Workflow Automation
  if (
    /\b(ai agent|workflow automation|n8n|zapier|make\.com|chatbot|langchain|rag|ai developer|ai automation|prompt engineer|fine-tuning llm|openai api|ai implementation|ai partners?|ai work|zoho|hubspot|crm implementation|data engineer(ing)?|scraper|scraping|data pipeline)\b/i.test(
      fullText,
    )
  ) {
    return 'AI & Automation'
  }

  // 11. Sales & Lead Generation
  if (
    /\b(lead gen(eration)?|cold outreach|appointment setter|cold email|b2b sales|b2b leads|sales rep|sdr|bdr|business development rep|lead list|apollo\.io|cold calling|telemarketing|sales executive)\b/i.test(
      fullText,
    )
  ) {
    return 'Sales & Lead Gen'
  }

  // 12. Web Development
  if (
    /\b(web dev(elop(er|ers|ment)?)?|website dev(elop(er|ers|ment)?)?|frontend( developer| developers)?|front-end|backend( developer| developers)?|back-end|fullstack|full-stack|next\.?js|react\.?js|react developer|vue|angular|node\.?js|express\.?js|django|flask|laravel|php developer|wordpress|elementor|divi|divibuilder|shopify|webflow|wix|squarespace|framer|html\/css|javascript developer|typescript developer|tailwind|prisma|graphql|rest api|mern|software engineer(s)?|software developer(s)?|salesforce developer|web accessibility|ontwikkelaar)\b/i.test(
      fullText,
    ) ||
    (/\b(develop(er|ers|ing)?|devs?|code|coding|build|program(mer|ming)?)\b/i.test(primaryText) &&
      /\b(website|web app|platform|portal|site|system|application)\b/i.test(primaryText))
  ) {
    return 'Web Development'
  }

  // 13. Consulting & Strategy
  if (
    /\b(fractional cmo|fractional cto|business consultant|strategy consultant|advisor|accountant|accounting|bookkeeper|bookkeeping|tax filing|crm system|advisory)\b/i.test(
      fullText,
    )
  ) {
    return 'Consulting & Strategy'
  }

  // Fallbacks
  if (/\b(seo)\b/i.test(fullText)) return 'SEO & Organic Growth'
  if (/\b(design|creative)\b/i.test(fullText)) return 'UI/UX Design'
  if (/\b(marketing|agency|advertising|promo)\b/i.test(fullText)) return 'Paid Ads & Marketing'
  if (/\b(developer|develop|code|programmer|software)\b/i.test(fullText)) return 'Web Development'

  return 'General'
}

export function NicheBadge({
  niche,
  keyword,
  content,
  intelligence,
  className = '',
  size = 'xs',
}: NicheBadgeProps) {
  const resolved = resolveNiche(niche, keyword, content, intelligence)
  const style = NICHE_STYLES[resolved] || DEFAULT_STYLE

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-2 py-0.5 tracking-tight'
      : 'text-xs px-2.5 py-1 tracking-normal'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border backdrop-blur-sm shadow-sm transition-all ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
      title={`Niche: ${resolved}`}
    >
      <span className="text-[11px] leading-none">{style.icon}</span>
      <span>{resolved}</span>
    </span>
  )
}
