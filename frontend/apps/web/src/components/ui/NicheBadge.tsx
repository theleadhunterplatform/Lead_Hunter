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
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/25',
    icon: '💻',
  },
  'Mobile Development': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/25',
    icon: '📱',
  },
  'UI/UX Design': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    border: 'border-purple-500/25',
    icon: '🎨',
  },
  'Branding & Design': {
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-500/25',
    icon: '✨',
  },
  'SEO & Organic Growth': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    icon: '📈',
  },
  'Paid Ads & Marketing': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-300',
    border: 'border-teal-500/25',
    icon: '🎯',
  },
  'Content & Copywriting': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    icon: '✍️',
  },
  'Video Production & Editing': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/25',
    icon: '🎬',
  },
  'Sales & Lead Gen': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/25',
    icon: '⚡',
  },
  'AI & Automation': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-500/25',
    icon: '🤖',
  },
  'Consulting & Strategy': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    border: 'border-indigo-500/25',
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
  if (niche && niche.trim()) return niche.trim()

  const kw = (keyword || '').toLowerCase().replace(/^watchlist:/, '')
  const c = (content || '').toLowerCase()
  const intel = (intelligence || '').toLowerCase()
  const text = `${kw} ${c} ${intel}`

  if (text.includes('nextjs') || text.includes('react') || text.includes('frontend') || text.includes('fullstack') || text.includes('web dev') || text.includes('web development') || text.includes('backend') || text.includes('node') || text.includes('wordpress') || text.includes('shopify') || text.includes('webflow')) {
    return 'Web Development'
  }
  if (text.includes('mobile app') || text.includes('ios') || text.includes('android') || text.includes('flutter')) {
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
  if (text.includes('copywrit') || text.includes('content writer') || text.includes('blog')) {
    return 'Content & Copywriting'
  }
  if (text.includes('video edit') || text.includes('reels') || text.includes('motion')) {
    return 'Video Production & Editing'
  }
  if (text.includes('cold email') || text.includes('lead gen') || text.includes('outreach') || text.includes('sales')) {
    return 'Sales & Lead Gen'
  }
  if (text.includes('ai agent') || text.includes('automation') || text.includes('n8n') || text.includes('zapier')) {
    return 'AI & Automation'
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
