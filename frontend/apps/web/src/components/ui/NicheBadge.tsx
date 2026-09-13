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
  const kw = (keyword || '').toLowerCase().replace(/^watchlist:/, '')
  const c = (content || '').toLowerCase()
  const intel = (intelligence || '').toLowerCase()
  const text = `${kw} ${c} ${intel}`

  // 1. Web Development
  const isWeb =
    /\b(website|web app|web application|web dev|web developer|web development|frontend|front-end|backend|back-end|fullstack|full-stack|next\.?js|react|react\.?js|vue|angular|node|node\.?js|express|django|flask|laravel|php|wordpress|woocommerce|shopify|webflow|wix|html|css|javascript|typescript|tailwind|mongodb|postgres|postgresql|mysql|prisma|rest api|graphql)\b/i.test(text)

  // 2. Mobile Development (strictly mobile, avoiding false positives on "web app" or "ios" in "portfolios")
  const isMobile =
    /\b(mobile app|ios app|android app|react native|flutter|swiftui|swift developer|kotlin|xcode)\b/i.test(text) ||
    /\b(ios developer|android developer|mobile developer|flutter developer)\b/i.test(text) ||
    (/\b(ios|android)\b/i.test(text) && /\b(app|mobile|sdk|play store|app store)\b/i.test(text))

  // 3. Paid Ads & Performance Marketing
  const isMarketing =
    /\b(performance marketing|paid ads|facebook ads|meta ads|google ads|media buyer|digital marketing|ad campaign|ppc|sem|roas|social media agency|social media marketing)\b/i.test(text)

  // 4. UI/UX Design
  const isUiUx =
    /\b(ui\/ux|ui ux|figma|product design|landing page design|web design|ux design|ui design|wireframe|wireframing|prototype|prototyping)\b/i.test(text)

  // 5. Branding & Graphic Design
  const isBranding =
    /\b(branding|brand identity|graphic design|graphic designer|logo design|magazine design|illustrator|print design|publishing studio)\b/i.test(text)

  // 6. SEO & Organic Growth
  const isSeo =
    /\b(seo|search engine optimization|organic traffic|backlinks|technical seo|link building)\b/i.test(text)

  // 7. Video Production & Editing
  const isVideo =
    /\b(video edit|video editor|video editing|motion graphics|reels editor|animator|after effects|premiere pro|video production)\b/i.test(text)

  // 8. Content & Copywriting
  const isCopy =
    /\b(copywriter|copywriting|content writer|content writing|technical writer|newsletter writer|editorial content|ghostwriter)\b/i.test(text)

  // 9. AI & Automation
  const isAi =
    /\b(ai agent|automation|n8n|zapier|make\.com|chatbot|langchain|rag|workflow automation|ai developer)\b/i.test(text)

  // Validate or infer:
  if (isMarketing && !isWeb && !isMobile) return 'Paid Ads & Marketing'
  if (isWeb && !isMobile) return 'Web Development'
  if (isMobile && !isWeb) return 'Mobile Development'
  if (isWeb && isMobile) {
    if (/\b(web app|website|next\.?js|react|frontend|backend)\b/i.test(text) && !/\b(ios app|android app)\b/i.test(text)) {
      return 'Web Development'
    }
    return 'Mobile Development'
  }
  if (isUiUx) return 'UI/UX Design'
  if (isBranding) return 'Branding & Design'
  if (isMarketing) return 'Paid Ads & Marketing'
  if (isVideo) return 'Video Production & Editing'
  if (isCopy) return 'Content & Copywriting'
  if (isSeo) return 'SEO & Organic Growth'
  if (isAi) return 'AI & Automation'

  if (niche && niche.trim() && NICHE_STYLES[niche.trim()]) {
    return niche.trim()
  }

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
