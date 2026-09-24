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

const primaryNiches = [
  'All',
  'Development',
  'Marketing',
  'Design',
  'AI & Automation',
  'Web Dev',
  'Web Design',
  'SEO',
  'Sales & RevOps',
  'Copywriting',
]

type SortOption = 'newest' | 'replyProbability' | 'urgency'

const FOR_YOU = 'For You'

function matchNicheFilter(lead: AppLead, activeNiche: string, userServices: string[] = []): boolean {
  if (!activeNiche || activeNiche === 'All') return true

  const leadNiche = (lead.category || '').toLowerCase().trim()
  const allNiches = (lead.niches || []).map((n) => n.toLowerCase().trim())
  const tags = (lead.nicheTags || []).map((t) => t.toLowerCase().trim())
  const text = `${lead.title || ''} ${lead.signalContext || ''} ${lead.taskScope || ''}`.toLowerCase()

  if (activeNiche === FOR_YOU) {
    if (!userServices || userServices.length === 0) return true
    return userServices.some((service) => {
      const s = service.toLowerCase().trim()
      // Web, Fullstack, Frontend, Backend, CMS, CRM & Integration
      if (
        s.includes('web dev') ||
        s.includes('web development') ||
        s.includes('software') ||
        s.includes('full-stack') ||
        s.includes('fullstack') ||
        s.includes('frontend') ||
        s.includes('backend') ||
        s.includes('wordpress') ||
        s.includes('webflow') ||
        s.includes('crm') ||
        s.includes('integration') ||
        s.includes('devops') ||
        s.includes('cloud')
      ) {
        return (
          leadNiche.includes('web develop') ||
          leadNiche.includes('web dev') ||
          leadNiche.includes('develop') ||
          leadNiche.includes('software') ||
          allNiches.some((n) => n.includes('dev') || n.includes('software')) ||
          tags.some((t) =>
            [
              'react', 'next.js', 'nextjs', 'node', 'fullstack', 'frontend', 'backend',
              'developer', 'wordpress', 'webflow', 'shopify', 'php', 'laravel', 'crm',
              'api', 'aws', 'docker', 'typescript', 'javascript', 'python',
            ].includes(t),
          ) ||
          text.includes('website') ||
          text.includes('web dev') ||
          text.includes('developer') ||
          text.includes('software') ||
          text.includes('crm')
        )
      }
      // Mobile Development
      if (s.includes('mobile') || s.includes('app develop') || s.includes('ios') || s.includes('android')) {
        return (
          leadNiche.includes('mobile') ||
          allNiches.some((n) => n.includes('mobile')) ||
          tags.some((t) => ['mobile', 'react native', 'flutter', 'ios', 'android', 'swift'].includes(t)) ||
          text.includes('mobile app') ||
          text.includes('ios') ||
          text.includes('android') ||
          text.includes('react native') ||
          text.includes('flutter')
        )
      }
      // UI/UX & Design
      if (
        s.includes('ui/ux') ||
        s.includes('design') ||
        s.includes('graphic') ||
        s.includes('brand') ||
        s.includes('pitch deck') ||
        s.includes('presentation') ||
        s.includes('packaging')
      ) {
        return (
          leadNiche.includes('design') ||
          leadNiche.includes('ui/ux') ||
          leadNiche.includes('branding') ||
          allNiches.some((n) => n.includes('design') || n.includes('ui/ux') || n.includes('branding')) ||
          tags.some((t) =>
            ['figma', 'ui/ux', 'design', 'graphic', 'landing page', 'branding', 'logo', 'ui', 'ux'].includes(t),
          ) ||
          text.includes('design') ||
          text.includes('ui/ux') ||
          text.includes('figma') ||
          text.includes('redesign')
        )
      }
      // SEO & Organic Growth
      if (s.includes('seo') || s.includes('organic')) {
        return (
          leadNiche.includes('seo') ||
          allNiches.some((n) => n.includes('seo') || n.includes('organic')) ||
          tags.some((t) => t.includes('seo') || t.includes('organic')) ||
          text.includes('seo') ||
          text.includes('search engine') ||
          text.includes('ranking')
        )
      }
      // Marketing & Paid Ads
      if (
        s.includes('marketing') ||
        s.includes('paid ads') ||
        s.includes('ads') ||
        s.includes('social media') ||
        s.includes('email marketing') ||
        s.includes('cro') ||
        s.includes('growth')
      ) {
        return (
          leadNiche.includes('market') ||
          leadNiche.includes('ads') ||
          allNiches.some((n) => n.includes('market') || n.includes('ads')) ||
          tags.some((t) =>
            ['marketing', 'paid ads', 'google ads', 'meta ads', 'facebook ads', 'growth', 'social media', 'cro'].includes(t),
          ) ||
          text.includes('marketing') ||
          text.includes('ads') ||
          text.includes('meta ads') ||
          text.includes('google ads')
        )
      }
      // Copywriting & Content
      if (
        s.includes('copywriting') ||
        s.includes('content') ||
        s.includes('writing') ||
        s.includes('messaging') ||
        s.includes('blog')
      ) {
        return (
          leadNiche.includes('copywriting') ||
          leadNiche.includes('content') ||
          allNiches.some((n) => n.includes('copywriting') || n.includes('content')) ||
          tags.some((t) => ['copywriting', 'content', 'writing', 'copywriter', 'blog', 'ghostwriting'].includes(t)) ||
          text.includes('copywriting') ||
          text.includes('content writer') ||
          text.includes('copywriter')
        )
      }
      // Video Production & Editing
      if (s.includes('video') || s.includes('motion') || s.includes('podcast') || s.includes('editing')) {
        return (
          leadNiche.includes('video') ||
          allNiches.some((n) => n.includes('video')) ||
          tags.some((t) => ['video', 'reels', 'motion', 'editing', 'youtube', 'video editor'].includes(t)) ||
          text.includes('video') ||
          text.includes('editing') ||
          text.includes('reels')
        )
      }
      // Sales, Lead Gen, CRM & Ops
      if (
        s.includes('consulting') ||
        s.includes('sales') ||
        s.includes('strategy') ||
        s.includes('lead gen') ||
        s.includes('outreach') ||
        s.includes('operations') ||
        s.includes('bdr') ||
        s.includes('sdr')
      ) {
        return (
          leadNiche.includes('consulting') ||
          leadNiche.includes('strategy') ||
          leadNiche.includes('sales') ||
          leadNiche.includes('lead gen') ||
          allNiches.some((n) => n.includes('consulting') || n.includes('strategy') || n.includes('sales')) ||
          tags.some((t) => ['sales', 'lead gen', 'cold outreach', 'consulting', 'strategy', 'bdr', 'sdr'].includes(t)) ||
          text.includes('lead generation') ||
          text.includes('cold outreach') ||
          text.includes('sales')
        )
      }
      // AI & Automation
      if (s.includes('ai') || s.includes('automation') || s.includes('machine learning')) {
        return (
          leadNiche.includes('ai') ||
          leadNiche.includes('automation') ||
          allNiches.some((n) => n.includes('ai') || n.includes('automation')) ||
          tags.some((t) => ['ai', 'automation', 'n8n', 'zapier', 'gpt', 'llm', 'make.com', 'ai agent'].includes(t)) ||
          text.includes('ai') ||
          text.includes('automation') ||
          text.includes('llm') ||
          text.includes('chatbot')
        )
      }

      return (
        leadNiche.includes(s) ||
        allNiches.some((n) => n.includes(s)) ||
        tags.some((t) => t.includes(s)) ||
        text.includes(s)
      )
    })
  }

  const target = activeNiche.toLowerCase().trim()

  // 1. Direct match on lead category or niches
  if (leadNiche === target || allNiches.includes(target)) return true

  // 2. Specific matching rules for primary niches tabs
  switch (target) {
    case 'development':
      return (
        leadNiche.includes('develop') ||
        leadNiche.includes('software') ||
        leadNiche.includes('web') ||
        leadNiche.includes('mobile') ||
        allNiches.some((n) => n.includes('dev') || n.includes('software')) ||
        tags.some((t) =>
          [
            'web development', 'frontend', 'backend', 'fullstack', 'react', 'next.js',
            'nextjs', 'wordpress', 'webflow', 'shopify', 'developer', 'node', 'mobile',
            'flutter', 'react native', 'ios', 'android', 'python', 'php',
          ].includes(t),
        ) ||
        text.includes('developer') ||
        text.includes('development')
      )
    case 'web dev':
    case 'web development':
      return (
        leadNiche.includes('web develop') ||
        leadNiche.includes('web dev') ||
        allNiches.some((n) => n.includes('web dev') || n.includes('web develop')) ||
        tags.some((t) =>
          ['web development', 'frontend', 'backend', 'fullstack', 'react', 'next.js', 'nextjs', 'wordpress', 'webflow', 'shopify', 'developer'].includes(t),
        ) ||
        text.includes('website') ||
        text.includes('web dev')
      )
    case 'mobile development':
      return (
        leadNiche.includes('mobile') ||
        allNiches.some((n) => n.includes('mobile')) ||
        tags.some((t) => ['mobile', 'react native', 'flutter', 'ios', 'android'].includes(t)) ||
        text.includes('mobile app') ||
        text.includes('ios') ||
        text.includes('android')
      )
    case 'design':
    case 'ui/ux design':
    case 'branding & design':
      return (
        leadNiche.includes('design') ||
        leadNiche.includes('ui/ux') ||
        leadNiche.includes('branding') ||
        allNiches.some((n) => n.includes('design') || n.includes('ui/ux') || n.includes('branding')) ||
        tags.some((t) =>
          ['ui/ux', 'ui', 'ux', 'figma', 'product design', 'landing page', 'branding', 'brand', 'logo', 'graphic', 'graphic design'].includes(t),
        ) ||
        text.includes('design') ||
        text.includes('figma') ||
        text.includes('branding')
      )
    case 'web design':
      return (
        leadNiche.includes('web design') ||
        (leadNiche.includes('design') && text.includes('web')) ||
        allNiches.some((n) => n.includes('web design') || (n.includes('design') && text.includes('web'))) ||
        tags.some((t) => ['web design', 'landing page', 'ui/ux', 'figma', 'redesign'].includes(t)) ||
        text.includes('website design') ||
        text.includes('web design')
      )
    case 'ai & automation':
      return (
        leadNiche.includes('ai') ||
        leadNiche.includes('automation') ||
        allNiches.some((n) => n.includes('ai') || n.includes('automation')) ||
        tags.some((t) => ['ai', 'automation', 'n8n', 'zapier', 'gpt', 'llm', 'make.com', 'ai agent'].includes(t)) ||
        text.includes('ai') ||
        text.includes('automation')
      )
    case 'seo':
    case 'seo & organic growth':
      return (
        leadNiche.includes('seo') ||
        leadNiche.includes('organic') ||
        allNiches.some((n) => n.includes('seo') || n.includes('organic')) ||
        tags.some((t) => ['seo', 'search engine', 'backlinks', 'organic growth', 'link building'].includes(t)) ||
        text.includes('seo') ||
        text.includes('organic search')
      )
    case 'marketing':
    case 'paid ads & marketing':
      return (
        leadNiche.includes('paid ads') ||
        leadNiche.includes('market') ||
        leadNiche.includes('ads') ||
        allNiches.some((n) => n.includes('ads') || n.includes('market')) ||
        tags.some((t) => ['marketing', 'paid ads', 'google ads', 'meta ads', 'facebook ads', 'growth', 'social media'].includes(t)) ||
        text.includes('marketing') ||
        text.includes('ads')
      )
    case 'copywriting':
    case 'content & copywriting':
      return (
        leadNiche.includes('copywriting') ||
        leadNiche.includes('content') ||
        allNiches.some((n) => n.includes('copywriting') || n.includes('content')) ||
        tags.some((t) => ['copywriting', 'content', 'writing', 'copywriter', 'blog'].includes(t)) ||
        text.includes('copywriting') ||
        text.includes('content writer')
      )
    case 'sales & revops':
    case 'sales & lead gen':
    case 'consulting & strategy':
      return (
        leadNiche.includes('sales') ||
        leadNiche.includes('crm') ||
        leadNiche.includes('consulting') ||
        leadNiche.includes('strategy') ||
        leadNiche.includes('lead gen') ||
        allNiches.some((n) => n.includes('sales') || n.includes('consulting') || n.includes('strategy')) ||
        tags.some((t) => ['sales', 'lead gen', 'cold outreach', 'consulting', 'strategy', 'advisory', 'crm'].includes(t)) ||
        text.includes('sales') ||
        text.includes('lead gen')
      )
    case 'video production & editing':
      return (
        leadNiche.includes('video') ||
        allNiches.some((n) => n.includes('video')) ||
        tags.some((t) => ['video', 'editing', 'reels', 'motion', 'video editing'].includes(t)) ||
        text.includes('video')
      )
    default:
      return (
        leadNiche.includes(target) ||
        allNiches.some((n) => n.includes(target)) ||
        tags.some((t) => t.includes(target)) ||
        text.includes(target)
      )
  }
}

export default function LeadsPage() {
  const { user } = useAuth()
  const userServices = useMemo(() => user?.servicesOffered || [], [user?.servicesOffered])
  const hasTargetField = userServices.length > 0

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeNiche, setActiveNiche] = useState<string>('All')
  const [hasInitializedNiche, setHasInitializedNiche] = useState(false)
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
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('lead')
      window.history.pushState({}, '', url.toString())
    } catch {
      // non-fatal
    }
  }

  // Fresh detail on open: list rows can be stale, merge canonical detail
  useEffect(() => {
    if (!selectedLeadId) return
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
          setLeadsList((prev) =>
            prev.map((l) =>
              l.id === fresh.id
                ? {
                    ...l,
                    ...fresh,
                    category:
                      fresh.category && fresh.category !== 'General'
                        ? fresh.category
                        : l.category || fresh.category,
                    niche:
                      fresh.niche && fresh.niche !== 'General'
                        ? fresh.niche
                        : l.niche || fresh.niche,
                    niches: fresh.niches && fresh.niches.length > 0 ? fresh.niches : l.niches,
                    nicheTags:
                      fresh.nicheTags && fresh.nicheTags.length > 0 ? fresh.nicheTags : l.nicheTags,
                  }
                : l,
            ),
          )
        }
      } catch {
        // keep list version, drawer still works
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

  useEffect(() => {
    if (!hasInitializedNiche && hasTargetField) {
      setActiveNiche(FOR_YOU)
      setHasInitializedNiche(true)
    }
  }, [hasInitializedNiche, hasTargetField])

  const availableNiches = useMemo(() => {
    if (hasTargetField) {
      return [FOR_YOU, ...primaryNiches]
    }
    return primaryNiches
  }, [hasTargetField])

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
          prev.map((l) => (l.id === leadId ? { ...l, status: isSaved ? 'saved' : 'new' } : l)),
        )
      }
    } catch (err) {
      console.error('Failed to toggle save state:', err)
    }
  }

  const allTags = Array.from(
    new Set(leadsList.flatMap((l) => l.nicheTags)),
  )

  const filteredLeads = useMemo(() => {
    let result = leadsList.filter((lead) => {
      if (!matchNicheFilter(lead, activeNiche, userServices)) return false
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
        result = [...result].sort((a, b) => b.replyProbability - a.replyProbability)
        break
      case 'urgency': {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 }
        result = [...result].sort((a, b) => weights[b.urgency] - weights[a.urgency])
        break
      }
      case 'newest':
      default:
        result = [...result].sort(
          (a, b) =>
            new Date(b.scrapedAt || b.timestamp).getTime() -
            new Date(a.scrapedAt || a.timestamp).getTime(),
        )
        break
    }

    return result
  }, [leadsList, activeNiche, userServices, debouncedSearch, selectedTags, sortBy])

  // Close the detail drawer whenever niche, search query, or tag filters change
  useEffect(() => {
    setSelectedLeadId(null)
  }, [activeNiche, debouncedSearch, selectedTags])

  const selectedLead = leadsList.find((l) => l.id === selectedLeadId) ?? filteredLeads.find((l) => l.id === selectedLeadId)

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
                { label: 'Newest First', value: 'newest' },
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
            const isForYou = niche === FOR_YOU
            return (
              <button
                key={niche}
                onClick={() => {
                  setActiveNiche(niche)
                  setHasInitializedNiche(true)
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? isForYou
                      ? 'bg-primary/20 border-primary/60 text-primary'
                      : 'bg-accent-purple/10 border-accent-purple/60 text-accent-purple'
                    : isForYou
                      ? 'bg-primary/[0.07] border-primary/25 text-primary/80 hover:bg-primary/15 hover:border-primary/50 hover:text-primary'
                      : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                }`}
              >
                <span>{niche}</span>
              </button>
            )
          })}
        </div>

        {/* Personalized Target Field Banner */}
        {hasTargetField && activeNiche === FOR_YOU && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/25 mb-6 text-xs transition-all">
            <div className="flex items-center gap-2 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span>
                Showing leads tailored to your onboarding target field:{' '}
                <strong className="text-primary font-semibold">{userServices.join(', ')}</strong>
              </span>
            </div>
            <button
              onClick={() => setActiveNiche('All')}
              className="text-primary hover:underline font-medium shrink-0 ml-auto transition-colors"
            >
              Browse all platform leads &rarr;
            </button>
          </div>
        )}

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
                            ? { ...l, ...(fullLead || {}), isRevealed: true, name, email, phone }
                            : l,
                        ),
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
