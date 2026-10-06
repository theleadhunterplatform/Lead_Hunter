'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

import LeadCard from './components/LeadCard'
import PipelineLeadCard from './components/PipelineLeadCard'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { useDebounce } from '@/hooks/useDebounce'

const LeadDrawer = dynamic(() => import('./components/LeadDrawer'), {
  ssr: false,
})

import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'
import type { AppLead } from '@/types/lead'
import { Select } from '@/components/ui'
import { getFirebaseToken } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'

const CANDIDATE_NICHES = [
  'Development',
  'Marketing',
  'Design',
  'AI & Automation',
  'Web Dev',
  'Web Design',
  'SEO',
  'Sales & RevOps',
  'Copywriting',
  'Video Production & Editing',
  'Mobile Development',
]

type SortOption = 'newest' | 'replyProbability' | 'urgency'

function matchNicheFilter(lead: AppLead, activeNiche: string): boolean {
  if (!activeNiche || activeNiche === 'All') return true

  const leadNiche = (lead.category || '').toLowerCase().trim()
  const allNiches = (lead.niches || []).map((n) => n.toLowerCase().trim())
  const tags = (lead.nicheTags || []).map((t) => t.toLowerCase().trim())
  const target = activeNiche.toLowerCase().trim()

  // 1. Direct match on lead category or niches
  if (leadNiche === target || allNiches.includes(target)) return true

  // 2. Specific matching rules for primary niches tabs
  switch (target) {
    case 'development':
      // Overarching development tab: Web, Mobile, Full-Stack, Software
      return (
        leadNiche.includes('develop') ||
        leadNiche.includes('software') ||
        leadNiche.includes('web dev') ||
        leadNiche.includes('mobile') ||
        allNiches.some(
          (n) =>
            n === 'development' ||
            n === 'web dev' ||
            n === 'web development' ||
            n.includes('develop') ||
            n.includes('software') ||
            n.includes('mobile'),
        ) ||
        (
          !leadNiche.includes('paid ads') &&
          !leadNiche.includes('video') &&
          tags.some((t) =>
            [
              'web development', 'frontend', 'backend', 'fullstack', 'full-stack',
              'full-stack development', 'react', 'next.js', 'nextjs', 'wordpress',
              'webflow', 'shopify', 'developer', 'node', 'mobile', 'flutter',
              'react native', 'ios', 'android', 'python', 'django', 'php', 'laravel',
              'javascript', 'typescript', 'java', 'angular', 'vue', 'html', 'css',
              'sql', 'liquid',
            ].includes(t),
          )
        )
      )

    case 'web dev':
    case 'web development':
      // Specifically Web Development / Sites / Web Apps
      return (
        leadNiche.includes('web dev') ||
        leadNiche.includes('web develop') ||
        allNiches.some((n) => n === 'web dev' || n === 'web development' || n.includes('web dev')) ||
        (
          !leadNiche.includes('paid ads') &&
          !leadNiche.includes('video') &&
          tags.some((t) =>
            [
              'web development', 'web dev', 'frontend', 'backend', 'fullstack', 'full-stack',
              'full-stack development', 'react', 'next.js', 'nextjs', 'wordpress', 'webflow',
              'shopify', 'liquid', 'php', 'laravel', 'vue', 'angular', 'html', 'css',
              'javascript', 'typescript', 'node', 'elementor', 'woocommerce',
            ].includes(t),
          )
        )
      )

    case 'web design':
      return (
        leadNiche === 'web design' ||
        allNiches.includes('web design') ||
        lead.title.toLowerCase().includes('web design') ||
        lead.title.toLowerCase().includes('website design') ||
        lead.title.toLowerCase().includes('web designer') ||
        tags.some((t) =>
          [
            'web design', 'website design', 'landing page', 'redesign', 'ui/ux',
            'figma', 'webflow', 'modern web design',
          ].includes(t.toLowerCase()),
        ) ||
        (leadNiche.includes('design') &&
          tags.some((t) => ['website', 'web', 'ui/ux', 'figma'].includes(t.toLowerCase())))
      )

    case 'mobile development':
      return (
        leadNiche.includes('mobile') ||
        allNiches.some((n) => n.includes('mobile')) ||
        tags.some((t) => ['mobile', 'react native', 'flutter', 'ios', 'android', 'swift'].includes(t))
      )

    case 'design':
    case 'ui/ux design':
    case 'branding & design':
      return (
        leadNiche === 'design' ||
        leadNiche.includes('ui/ux') ||
        leadNiche.includes('branding') ||
        leadNiche.includes('design') ||
        allNiches.some((n) => n === 'design' || n.includes('ui/ux') || n.includes('branding') || n === 'web design') ||
        tags.some((t) =>
          [
            'ui/ux', 'ui', 'ux', 'figma', 'product design', 'landing page', 'branding',
            'brand', 'logo', 'logo design', 'graphic', 'graphic design', 'brand identity',
          ].includes(t),
        )
      )

    case 'marketing':
    case 'paid ads & marketing':
      // Specifically Paid Ads, PPC, Growth & Ad Campaigns (NOT web dev / spreadsheets)
      return (
        leadNiche.includes('paid ads') ||
        leadNiche.includes('marketing') ||
        leadNiche.includes('media buying') ||
        leadNiche.includes('advertising') ||
        allNiches.some((n) => n === 'marketing' || n === 'paid ads' || n === 'paid ads & marketing') ||
        (
          !leadNiche.includes('web develop') &&
          !leadNiche.includes('video') &&
          tags.some((t) =>
            [
              'marketing', 'paid ads', 'meta ads', 'facebook ads', 'google ads',
              'digital marketing', 'growth marketing', 'performance marketing', 'ppc',
              'social media marketing', 'media buying', 'ad campaigns', 'google business profile',
            ].includes(t),
          )
        )
      )

    case 'ai & automation':
      // AI & Automation (n8n, Zapier, LLM, GPT, AI Agents, Chatbots - NEVER match raw 'ai' in 'paid' or 'email'!)
      return (
        leadNiche.includes('automation') ||
        leadNiche === 'ai & automation' ||
        leadNiche === 'artificial intelligence' ||
        allNiches.some((n) => n === 'ai & automation' || n === 'ai' || n === 'automation') ||
        tags.some((t) =>
          [
            'ai', 'automation', 'n8n', 'zapier', 'gpt', 'llm', 'make.com', 'ai agent',
            'ai agents', 'chatbot', 'chatbots', 'workflow automation', 'ai storytelling',
            'openai', 'claude', 'machine learning', 'api integrations',
          ].includes(t),
        ) ||
        /\b(ai agent|ai agents|workflow automation|n8n|zapier|make\.com|chatgpt|openai|llm)\b/i.test(lead.title)
      )

    case 'seo':
    case 'seo & organic growth':
      return (
        leadNiche.includes('seo') ||
        leadNiche.includes('organic') ||
        allNiches.some((n) => n === 'seo' || n.includes('organic')) ||
        (
          !leadNiche.includes('web develop') &&
          tags.some((t) =>
            [
              'seo', 'search engine optimization', 'backlinks', 'link building',
              'organic growth', 'organic search', 'technical seo', 'local seo',
              'google search console', 'ahrefs', 'semrush',
            ].includes(t),
          )
        )
      )

    case 'sales & revops':
    case 'sales & lead gen':
    case 'consulting & strategy':
      return (
        ((leadNiche.includes('sales') ||
          leadNiche.includes('lead gen') ||
          ((leadNiche.includes('consulting') || leadNiche.includes('strategy')) &&
            !lead.title.toLowerCase().includes('app develop') &&
            !lead.title.toLowerCase().includes('web develop') &&
            !tags.some((t) => ['react native', 'flutter', 'ios', 'android', 'javascript', 'html', 'css', 'php', 'laravel'].includes(t.toLowerCase())))) &&
          !leadNiche.includes('web develop')) ||
        allNiches.some(
          (n) =>
            n === 'sales & revops' ||
            n === 'sales' ||
            n === 'lead gen' ||
            (n.includes('consulting') &&
              !lead.title.toLowerCase().includes('app develop') &&
              !lead.title.toLowerCase().includes('web develop')),
        ) ||
        (
          !leadNiche.includes('web develop') &&
          tags.some((t) =>
            [
              'sales', 'lead gen', 'lead generation', 'cold outreach', 'cold email',
              'bdr', 'sdr', 'revops', 'sales strategy', 'appointment setting',
            ].includes(t),
          )
        )
      )

    case 'copywriting':
    case 'content & copywriting':
      return (
        leadNiche.includes('copywriting') ||
        leadNiche.includes('copywriter') ||
        allNiches.some((n) => n === 'copywriting' || n === 'content writing') ||
        (
          !leadNiche.includes('paid ads') &&
          !leadNiche.includes('video') &&
          tags.some((t) =>
            [
              'copywriting', 'copywriter', 'content writing', 'content writer',
              'email copy', 'sales copy', 'ghostwriting', 'technical writing',
              'blog writing', 'newsletter writing',
            ].includes(t),
          )
        )
      )

    case 'video production & editing':
      return (
        leadNiche.includes('video') ||
        allNiches.some((n) => n.includes('video')) ||
        tags.some((t) =>
          [
            'video', 'video production', 'editing', 'video editing', 'reels',
            'reels-format content', 'motion', 'youtube production',
          ].includes(t),
        )
      )

    default:
      return (
        leadNiche === target ||
        allNiches.includes(target) ||
        tags.includes(target)
      )
  }
}

export default function LeadsPage() {
  const { user } = useAuth()

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [drawerLeadDetail, setDrawerLeadDetail] = useState<AppLead | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeNiche, setActiveNiche] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode] = useState<'grid' | 'pipeline'>('pipeline')

  const [leadsList, setLeadsList] = useState<AppLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getFirebaseToken()
      const res = await fetch('/api/leads?pageSize=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setLeadsList(json.data)
      } else {
        setError(json.message || 'Failed to load leads.')
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err)
      setError('Could not reach the lead feed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // Deep-link: ?lead=<id> opens the drawer on load / share
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get('lead')
      if (id) setSelectedLeadId(id)
    } catch {
      // ignore malformed URL
    }
  }, [])

  const openLead = (id: string) => {
    setSelectedLeadId(id)
    const initial = leadsList.find((l) => l.id === id) || null
    setDrawerLeadDetail(initial)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('lead', id)
      window.history.pushState({}, '', url.toString())
    } catch {
      // non-fatal
    }
  }

  const closeLead = () => {
    setSelectedLeadId(null)
    setDrawerLeadDetail(null)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('lead')
      window.history.pushState({}, '', url.toString())
    } catch {
      // non-fatal
    }
  }

  // Fresh detail on open: update drawer detail state without mutating or re-sorting the main feed
  useEffect(() => {
    if (!selectedLeadId) {
      setDrawerLeadDetail(null)
      return
    }
    if (
      selectedLeadId.startsWith('mock') ||
      selectedLeadId.startsWith('hero') ||
      selectedLeadId.startsWith('card')
    )
      return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getFirebaseToken()
        const res = await fetch(`/api/leads/${selectedLeadId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (!cancelled && res.ok && json.data) {
          const fresh = json.data as AppLead
          setDrawerLeadDetail((prev) => {
            if (!prev || prev.id !== fresh.id) return fresh
            return {
              ...prev,
              ...fresh,
              category:
                fresh.category && fresh.category !== 'General'
                  ? fresh.category
                  : prev.category || fresh.category,
              niche:
                fresh.niche && fresh.niche !== 'General'
                  ? fresh.niche
                  : prev.niche || fresh.niche,
              niches: fresh.niches && fresh.niches.length > 0 ? fresh.niches : prev.niches,
              nicheTags:
                fresh.nicheTags && fresh.nicheTags.length > 0 ? fresh.nicheTags : prev.nicheTags,
            }
          })
        }
      } catch {
        // keep existing drawer data
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedLeadId])

  // Esc closes drawer + lock background scroll while open
  useEffect(() => {
    if (!selectedLeadId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLead()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [selectedLeadId])

  const handleSaveToggle = async (leadId: string, isSaved: boolean) => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isSaved, status: isSaved ? 'saved' : 'new' }),
      })
      if (res.ok) {
        setLeadsList((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: isSaved ? 'saved' : 'new', isSaved } : l)),
        )
        setDrawerLeadDetail((prev) =>
          prev && prev.id === leadId ? { ...prev, status: isSaved ? 'saved' : 'new', isSaved } : prev,
        )
      }
    } catch (err) {
      console.error('Failed to toggle save state:', err)
    }
  }

  const allTags = Array.from(
    new Set(leadsList.flatMap((l) => l.nicheTags)),
  )

  // Dynamically compute available niches based on leads actually present in the DB
  const availableNiches = useMemo(() => {
    if (!leadsList.length) return ['All']

    const customNiches = new Set<string>()
    for (const lead of leadsList) {
      if (lead.category && lead.category !== 'General' && lead.category !== 'All') {
        customNiches.add(lead.category)
      }
      for (const n of lead.niches || []) {
        if (n && n !== 'General' && n !== 'All') {
          customNiches.add(n)
        }
      }
    }

    const allCandidates = Array.from(new Set([...CANDIDATE_NICHES, ...customNiches]))
    const activeFilters = allCandidates.filter((niche) =>
      leadsList.some((lead) => matchNicheFilter(lead, niche)),
    )

    return ['All', ...activeFilters]
  }, [leadsList])

  // Reset activeNiche to 'All' if the active filter no longer has any leads in the DB
  useEffect(() => {
    if (activeNiche !== 'All' && availableNiches.length > 0 && !availableNiches.includes(activeNiche)) {
      setActiveNiche('All')
    }
  }, [availableNiches, activeNiche])

  const filteredLeads = useMemo(() => {
    let result = leadsList.filter((lead) => {
      if (!matchNicheFilter(lead, activeNiche)) return false
      if (debouncedSearch.trim() !== '') {
        const query = debouncedSearch.toLowerCase()
        const matchesSearch =
          lead.title.toLowerCase().includes(query) ||
          lead.signalContext.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.category.toLowerCase().includes(query) ||
          lead.nicheTags.some((tag) => tag.toLowerCase().includes(query)) ||
          (lead.niches && lead.niches.some((n) => n.toLowerCase().includes(query)))
        if (!matchesSearch) return false
      }
      if (selectedTags.length > 0) {
        const hasMatchingTag = selectedTags.some((tag) => lead.nicheTags.includes(tag))
        if (!hasMatchingTag) return false
      }
      return true
    })

    switch (sortBy) {
      case 'replyProbability':
        result = [...result].sort((a, b) => {
          const aClaimed = a.isClaimedByOther ? 1 : 0
          const bClaimed = b.isClaimedByOther ? 1 : 0
          if (aClaimed !== bClaimed) return aClaimed - bClaimed
          return b.replyProbability - a.replyProbability
        })
        break
      case 'urgency': {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 }
        result = [...result].sort((a, b) => {
          const aClaimed = a.isClaimedByOther ? 1 : 0
          const bClaimed = b.isClaimedByOther ? 1 : 0
          if (aClaimed !== bClaimed) return aClaimed - bClaimed
          return weights[b.urgency] - weights[a.urgency]
        })
        break
      }
      case 'newest':
      default:
        result = [...result].sort((a, b) => {
          // 1. Unclaimed leads always come before claimed leads
          const aClaimed = a.isClaimedByOther ? 1 : 0
          const bClaimed = b.isClaimedByOther ? 1 : 0
          if (aClaimed !== bClaimed) {
            return aClaimed - bClaimed // 0 (unclaimed) before 1 (claimed)
          }

          // 2. Most recently approved / added leads first
          const aTime = new Date(a.approvedAt || a.reviewedAt || a.scrapedAt || 0).getTime()
          const bTime = new Date(b.approvedAt || b.reviewedAt || b.scrapedAt || 0).getTime()
          return bTime - aTime
        })
        break
    }

    return result
  }, [leadsList, activeNiche, debouncedSearch, selectedTags, sortBy])

  // Close the detail drawer whenever niche, search query, or tag filters change
  useEffect(() => {
    setSelectedLeadId(null)
  }, [activeNiche, debouncedSearch, selectedTags])

  const selectedLead =
    (drawerLeadDetail && drawerLeadDetail.id === selectedLeadId ? drawerLeadDetail : null) ??
    leadsList.find((l) => l.id === selectedLeadId) ??
    filteredLeads.find((l) => l.id === selectedLeadId) ??
    null

  // Temporary toggle: pause showing leads and display the holding state
  const HIDE_LEADS_FOR_NOW = true

  if (HIDE_LEADS_FOR_NOW) {
    return (
      <main
        data-lenis-prevent
        className="flex-1 h-full min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 relative scrollbar-hide"
      >
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8 mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Lead Feed</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                Sourcing Active
              </span>
            </div>
          </div>

          <div className="min-h-[500px] flex flex-col items-center justify-center py-20 px-6 text-center rounded-3xl bg-surface-secondary/20 border border-white/[0.06] backdrop-blur-xl relative overflow-hidden shadow-2xl">
            {/* Ambient background glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-purple/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-accent-blue/10 rounded-full blur-2xl pointer-events-none" />

            {/* Pulsing Hunter Radar Icon */}
            <div className="relative mb-8">
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center shadow-xl backdrop-blur-md">
                <span className="absolute inset-0 rounded-3xl border border-accent-purple/40 animate-ping opacity-30" />
                <span className="absolute -inset-2 rounded-3xl border border-accent-purple/20 animate-pulse opacity-50" />

                <motion.div
                  animate={{
                    rotate: [0, 8, -8, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-12 h-12 rounded-2xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center text-accent-purple shadow-inner"
                >
                  <MagnifyingGlassIcon className="w-6 h-6 text-accent-purple animate-pulse" />
                </motion.div>
              </div>

              {/* Status active beacon */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-accent-purple shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              </span>
            </div>

            {/* Main Required Message */}
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-3">
              Hold up we are finding leads for you
            </h2>

            <p className="text-sm sm:text-base text-text-secondary/80 max-w-lg leading-relaxed mb-8">
              Our AI discovery engine is actively hunting, analyzing, and verifying high-intent leads tailored for you. New opportunities will be delivered to your feed shortly.
            </p>

            {/* Live activity indicator */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-xs font-medium text-text-secondary">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Scanning live signals across global channels...</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      data-lenis-prevent
      className="flex-1 h-full min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 relative scrollbar-hide"
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 mt-2">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1 w-full">
            <div className="flex items-center gap-4 shrink-0">
              <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Lead Feed</h1>
            </div>

            <div className="relative group flex-1 w-full">
              <div className="relative flex items-center bg-code-bg/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1.5 shadow-lg focus-within:border-white/20 transition-all">
                <div className="pl-3 pr-2 text-text-secondary">
                  <MagnifyingGlassIcon className="w-4 h-4 text-current" />
                </div>
                <input
                  type="text"
                  placeholder="Search signals... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-text-primary text-[13px] placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 py-1.5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 min-h-[44px] text-[11px] font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <div className="hidden [@media(pointer:fine)]:flex items-center gap-1.5 pr-2">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-widest">
                    ⌘K
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
            <Select
              options={[
                { label: 'Recently Approved', value: 'newest' },
                { label: 'Highest Reply Probability', value: 'replyProbability' },
                { label: 'Most Urgent', value: 'urgency' },
              ]}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortOption)}
              size="sm"
            />

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] shrink-0 rounded-xl bg-code-bg/80 backdrop-blur-xl border shadow-lg text-[13px] font-medium transition-all ${
                isFilterOpen || selectedTags.length > 0
                  ? 'border-accent-purple bg-accent-purple/10 text-text-primary'
                  : 'border-white/[0.08] hover:bg-white/5 hover:border-white/15 text-text-primary'
              }`}
            >
              <AdjustmentsHorizontalIcon
                className={`w-[14px] h-[14px] ${isFilterOpen || selectedTags.length > 0 ? 'text-accent-purple' : 'text-text-secondary'}`}
              />
              <span>Filters</span>
              {selectedTags.length > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-accent-purple text-text-on-accent rounded-full ml-1">
                  {selectedTags.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setIsFilterOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl bg-surface-elevated border border-white/[0.08] p-4 shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        Filter by Tags
                      </span>
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="text-[11px] font-medium text-accent-purple hover:underline px-3 py-2"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div
                      className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {allTags.length === 0 ? (
                        <span className="text-xs text-text-secondary/50 py-2">
                          No tags available
                        </span>
                      ) : (
                        allTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag)
                          return (
                            <button
                              key={tag}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTags(selectedTags.filter((t) => t !== tag))
                                } else {
                                  setSelectedTags([...selectedTags, tag])
                                }
                              }}
                              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                                  : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/10 hover:text-text-primary'
                              }`}
                            >
                              {tag}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Niche Filter Pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4 md:-mx-0 md:px-0 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {availableNiches.map((niche) => {
            const isActive = activeNiche === niche
            return (
              <button
                key={niche}
                onClick={() => setActiveNiche(niche)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-accent-purple/10 border-accent-purple/60 text-accent-purple'
                    : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                }`}
              >
                <span>{niche}</span>
              </button>
            )
          })}
        </div>

        <div
          className="grid gap-4 auto-rows-fr items-stretch transition-all duration-300 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
              {loading ? (
                <div className="col-span-full">
                  <CustomLoader page="leads" />
                </div>
              ) : error ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-secondary/20 border border-white/[0.04] rounded-3xl backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-1">Couldn&apos;t load leads</h3>
                  <p className="text-sm text-text-secondary/70 max-w-sm">{error}</p>
                  <button
                    onClick={fetchLeads}
                    className="mt-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-text-primary transition-all inline-flex items-center gap-2"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-secondary/20 border border-white/[0.04] rounded-3xl backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-text-secondary">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-text-secondary" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-1">No signals found</h3>
                  <p className="text-sm text-text-secondary/70 max-w-sm">
                    Try clearing your search query or selected tags to view more opportunities.
                  </p>
                  {(searchQuery || selectedTags.length > 0 || activeNiche !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedTags([])
                        setActiveNiche('All')
                      }}
                      className="mt-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-text-primary transition-all"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredLeads.map((lead, index) =>
                  viewMode === 'pipeline' ? (
                    <PipelineLeadCard
                      key={lead.id}
                      lead={lead}
                      index={index}
                      isSelected={lead.id === selectedLeadId}
                      onClick={() => openLead(lead.id)}
                      onSaveToggle={(isSaved) => handleSaveToggle(lead.id, isSaved)}
                      onReveal={(leadId, name, email, phone) => {
                        setLeadsList((prev) =>
                          prev.map((l) =>
                            l.id === leadId ? { ...l, isRevealed: true, name, email, phone } : l,
                          ),
                        )
                      }}
                    />
                  ) : (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      index={index}
                      isSelected={lead.id === selectedLeadId}
                      onClick={() => openLead(lead.id)}
                      onSaveToggle={(isSaved) => handleSaveToggle(lead.id, isSaved)}
                      onReveal={(leadId, name, email, phone) => {
                        setLeadsList((prev) =>
                          prev.map((l) =>
                            l.id === leadId ? { ...l, isRevealed: true, name, email, phone } : l,
                          ),
                        )
                      }}
                    />
                  )
                )
              )}
            </div>

          <AnimatePresence>
            {selectedLead && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
              >
                <div
                  onClick={closeLead}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, y: 36, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.97 }}
                  transition={{ type: 'spring', damping: 32, stiffness: 300 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Lead details: ${selectedLead.title}`}
                  className="relative h-[88dvh] w-full max-h-[88dvh] overflow-hidden rounded-t-3xl sm:h-[min(86vh,820px)] sm:max-h-[min(86vh,820px)] sm:w-[min(720px,100%)] sm:max-w-[720px] sm:rounded-[22px]"
                >
                  <LeadDrawer
                    lead={selectedLead}
                    onClose={closeLead}
                    onSaveToggle={(isSaved) => handleSaveToggle(selectedLead.id, isSaved)}
                    onReveal={(name, email, phone, fullLead) => {
                      setLeadsList((prev) =>
                        prev.map((l) =>
                          l.id === selectedLead.id
                            ? {
                                ...l,
                                isRevealed: true,
                                name,
                                email,
                                phone: phone ?? l.phone,
                                status: 'saved',
                                isSaved: true,
                                ...(fullLead?.creditCost !== undefined ? { creditCost: fullLead.creditCost } : {}),
                              }
                            : l,
                        ),
                      )
                      setDrawerLeadDetail((prev) =>
                        prev && prev.id === selectedLead.id
                          ? {
                              ...prev,
                              isRevealed: true,
                              name,
                              email,
                              phone: phone ?? prev.phone,
                              status: 'saved',
                              isSaved: true,
                              ...(fullLead?.creditCost !== undefined ? { creditCost: fullLead.creditCost } : {}),
                            }
                          : prev,
                      )
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </main>
  )
}
