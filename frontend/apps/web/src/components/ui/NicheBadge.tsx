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
  if (niche && niche.trim()) {
    const raw = niche.trim()
    if (NICHE_STYLES[raw]) return raw
    const lower = raw.toLowerCase()
    if (lower.includes('web develop') || lower === 'web dev' || lower === 'development') return 'Web Development'
    if (lower.includes('mobile')) return 'Mobile Development'
    if (lower.includes('ui/ux') || lower === 'design' || lower.includes('product design') || lower.includes('web design')) return 'UI/UX Design'
    if (lower.includes('brand') || lower.includes('graphic')) return 'Branding & Design'
    if (lower.includes('seo')) return 'SEO & Organic Growth'
    if (lower.includes('paid ads') || lower.includes('marketing')) return 'Paid Ads & Marketing'
    if (lower.includes('copywrit') || lower.includes('content') || lower === 'copywriting') return 'Content & Copywriting'
    if (lower.includes('video')) return 'Video Production & Editing'
    if (lower.includes('sales') || lower.includes('lead gen') || lower.includes('revops')) return 'Sales & Lead Gen'
    if (lower.includes('ai') || lower.includes('automation')) return 'AI & Automation'
    if (lower.includes('consulting') || lower.includes('strategy')) return 'Consulting & Strategy'
    return raw
  }

  const kw = (keyword || '').toLowerCase().replace(/^watchlist:/, '')
  const c = (content || '').toLowerCase()
  const intel = (intelligence || '').toLowerCase()
  const text = `${kw} ${c} ${intel}`

  if (text.includes('nextjs') || text.includes('react') || text.includes('frontend') || text.includes('fullstack') || text.includes('web dev') || text.includes('web development') || text.includes('backend') || text.includes('node') || text.includes('wordpress') || text.includes('shopify') || text.includes('webflow') || text.includes('website developer') || text.includes('web developer') || text.includes('software developer')) {
    return 'Web Development'
  }
  if (text.includes('mobile app') || text.includes('ios') || text.includes('android') || text.includes('flutter') || text.includes('react native')) {
    return 'Mobile Development'
  }
  if (text.includes('ui/ux') || text.includes('figma') || text.includes('product design') || text.includes('web design') || text.includes('landing page')) {
    return 'UI/UX Design'
  }
  if (text.includes('branding') || text.includes('graphic design') || text.includes('logo')) {
    return 'Branding & Design'
  }
  if (text.includes('seo') || text.includes('organic search') || text.includes('backlink')) {
    return 'SEO & Organic Growth'
  }
  if (text.includes('paid ads') || text.includes('facebook ads') || text.includes('google ads') || text.includes('performance marketing')) {
    return 'Paid Ads & Marketing'
  }
  if (text.includes('copywrit') || text.includes('content writer') || text.includes('blog') || text.includes('copywriting')) {
    return 'Content & Copywriting'
  }
  if (text.includes('video edit') || text.includes('reels') || text.includes('motion')) {
    return 'Video Production & Editing'
  }
  if (text.includes('cold email') || text.includes('lead gen') || text.includes('outreach') || text.includes('sales') || text.includes('revops')) {
    return 'Sales & Lead Gen'
  }
  if (text.includes('ai agent') || text.includes('automation') || text.includes('n8n') || text.includes('zapier') || text.includes('artificial intelligence')) {
    return 'AI & Automation'
  }
  if (text.includes('consulting') || text.includes('consultant') || text.includes('strategy')) {
    return 'Consulting & Strategy'
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
