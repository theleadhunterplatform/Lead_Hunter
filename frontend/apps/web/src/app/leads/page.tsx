'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import LeadCard from './components/LeadCard'
import PipelineLeadCard from './components/PipelineLeadCard'
import LeadDrawer from './components/LeadDrawer'
import { CustomLoader } from '@/components/ui/CustomLoader'

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
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Branding & Design',
  'AI & Automation',
  'SEO & Organic Growth',
  'Paid Ads & Marketing',
  'Video Production & Editing',
  'Consulting & Strategy',
]

function matchNicheFilter(lead: AppLead, activeNiche: string, userServices: string[] = []): boolean {
  if (!activeNiche || activeNiche === 'All') return true

  const leadNiche = (lead.niche || lead.category || '').toLowerCase().trim()
  const allNiches = (lead.niches || []).map((n) => n.toLowerCase().trim())
  const tags = (lead.nicheTags || []).map((t) => t.toLowerCase().trim())
  const text = `${lead.title || ''} ${lead.signalContext || ''} ${lead.taskScope || ''}`.toLowerCase()

  if (activeNiche === '🎯 For You') {
    if (!userServices || userServices.length === 0) return true
    return userServices.some((service) => {
      const s = service.toLowerCase().trim()
      if (s.includes('web dev') || s.includes('wordpress') || s.includes('webflow')) {
        return (
          leadNiche.includes('web develop') ||
          leadNiche.includes('web dev') ||
          allNiches.some((n) => n.includes('web dev') || n.includes('web develop')) ||
          tags.some((t) => ['react', 'next.js', 'nextjs', 'node', 'fullstack', 'frontend', 'backend', 'developer', 'wordpress', 'webflow', 'shopify'].includes(t)) ||
          text.includes('website') || text.includes('web dev')
        )
      }
      if (s.includes('mobile')) {
        return (
          leadNiche.includes('mobile') ||
          allNiches.some((n) => n.includes('mobile')) ||
          tags.some((t) => ['mobile', 'react native', 'flutter', 'ios', 'android'].includes(t)) ||
          text.includes('mobile app') || text.includes('ios') || text.includes('android')
        )
      }
      if (s.includes('ui/ux') || s.includes('product design') || s.includes('design')) {
        return (
          leadNiche.includes('design') ||
          leadNiche.includes('ui/ux') ||
          allNiches.some((n) => n.includes('design') || n.includes('ui/ux')) ||
          tags.some((t) => ['figma', 'ui/ux', 'design', 'graphic', 'landing page', 'branding'].includes(t))
        )
      }
      if (s.includes('graphic') || s.includes('brand')) {
        return (
          leadNiche.includes('branding') ||
          leadNiche.includes('design') ||
          allNiches.some((n) => n.includes('branding') || n.includes('design')) ||
          tags.some((t) => ['graphic', 'branding', 'logo'].includes(t))
        )
      }
      if (s.includes('seo')) {
        return (
          leadNiche.includes('seo') ||
          allNiches.some((n) => n.includes('seo')) ||
          tags.some((t) => t.includes('seo')) ||
          text.includes('seo') || text.includes('search engine')
        )
      }
      if (s.includes('marketing') || s.includes('paid ads') || s.includes('ads')) {
        return (
          leadNiche.includes('market') ||
          leadNiche.includes('ads') ||
          allNiches.some((n) => n.includes('market') || n.includes('ads'))
        )
      }
      if (s.includes('video')) {
        return (
          leadNiche.includes('video') ||
          allNiches.some((n) => n.includes('video')) ||
          tags.some((t) => ['video', 'reels', 'motion', 'editing'].includes(t))
        )
      }
      if (s.includes('consulting') || s.includes('sales') || s.includes('strategy')) {
        return (
          leadNiche.includes('consulting') ||
          leadNiche.includes('strategy') ||
          leadNiche.includes('sales') ||
          allNiches.some((n) => n.includes('consulting') || n.includes('strategy') || n.includes('sales'))
        )
      }
      if (s.includes('ai') || s.includes('automation')) {
        return (
          leadNiche.includes('ai') ||
          leadNiche.includes('automation') ||
          allNiches.some((n) => n.includes('ai') || n.includes('automation')) ||
          tags.some((t) => ['ai', 'automation', 'n8n', 'zapier', 'gpt', 'llm'].includes(t))
        )
      }

      return (
        leadNiche.includes(s) ||
        allNiches.some((n) => n.includes(s)) ||
        tags.some((t) => t.includes(s))
      )
    })
  }

  const target = activeNiche.toLowerCase().trim()

  // 1. Direct match on lead.niche or lead.niches
  if (leadNiche === target || allNiches.includes(target)) return true

  // 2. Specific matching rules for primary niches
  switch (target) {
    case 'web development':
      return (
        leadNiche.includes('web develop') ||
        leadNiche.includes('web dev') ||
        allNiches.some((n) => n.includes('web dev') || n.includes('web develop')) ||
        tags.some((t) => ['web development', 'frontend', 'backend', 'fullstack', 'react', 'next.js', 'nextjs', 'wordpress', 'webflow', 'shopify', 'developer'].includes(t)) ||
        text.includes('website') || text.includes('web dev')
      )
    case 'mobile development':
      return (
        leadNiche.includes('mobile') ||
        allNiches.some((n) => n.includes('mobile')) ||
        tags.some((t) => ['mobile', 'react native', 'flutter', 'ios', 'android'].includes(t)) ||
        text.includes('mobile app') || text.includes('ios') || text.includes('android')
      )
    case 'ui/ux design':
      return (
        leadNiche.includes('ui/ux') ||
        leadNiche.includes('ux') ||
        leadNiche.includes('ui') ||
        allNiches.some((n) => n.includes('ui/ux') || n.includes('design')) ||
        tags.some((t) => ['ui/ux', 'ui', 'ux', 'figma', 'product design', 'landing page'].includes(t))
      )
    case 'branding & design':
      return (
        leadNiche.includes('branding') ||
        leadNiche.includes('design') ||
        allNiches.some((n) => n.includes('branding') || n.includes('design')) ||
        tags.some((t) => ['branding', 'brand', 'logo', 'graphic', 'graphic design'].includes(t))
      )
    case 'ai & automation':
      return (
        leadNiche.includes('ai') ||
        leadNiche.includes('automation') ||
        allNiches.some((n) => n.includes('ai') || n.includes('automation')) ||
        tags.some((t) => ['ai', 'automation', 'n8n', 'zapier', 'gpt', 'llm', 'make.com', 'ai agent'].includes(t))
      )
    case 'seo & organic growth':
      return (
        leadNiche.includes('seo') ||
        leadNiche.includes('organic') ||
        allNiches.some((n) => n.includes('seo') || n.includes('organic')) ||
        tags.some((t) => ['seo', 'search engine', 'backlinks', 'organic growth', 'link building'].includes(t)) ||
        text.includes('seo')
      )
    case 'paid ads & marketing':
      return (
        leadNiche.includes('paid ads') ||
        leadNiche.includes('market') ||
        leadNiche.includes('ads') ||
        allNiches.some((n) => n.includes('ads') || n.includes('market')) ||
        tags.some((t) => ['marketing', 'paid ads', 'google ads', 'meta ads', 'facebook ads', 'growth'].includes(t))
      )
    case 'video production & editing':
      return (
        leadNiche.includes('video') ||
        allNiches.some((n) => n.includes('video')) ||
        tags.some((t) => ['video', 'editing', 'reels', 'motion', 'video editing'].includes(t)) ||
        text.includes('video')
      )
    case 'consulting & strategy':
      return (
        leadNiche.includes('consulting') ||
        leadNiche.includes('strategy') ||
        leadNiche.includes('sales') ||
        allNiches.some((n) => n.includes('consulting') || n.includes('strategy')) ||
        tags.some((t) => ['consulting', 'strategy', 'advisory', 'business strategy'].includes(t))
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

type SortOption = 'newest' | 'replyProbability' | 'urgency'

export default function LeadsPage() {
  const { user } = useAuth()
  const userServices = useMemo(() => user?.servicesOffered || [], [user?.servicesOffered])
  const hasTargetField = userServices.length > 0

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeNiche, setActiveNiche] = useState<string>('All')
  const [hasInitializedNiche, setHasInitializedNiche] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('pipeline')

  const [leadsList, setLeadsList] = useState<AppLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasInitializedNiche && hasTargetField) {
      setActiveNiche('🎯 For You')
      setHasInitializedNiche(true)
    }
  }, [hasInitializedNiche, hasTargetField])

  const availableNiches = useMemo(() => {
    if (hasTargetField) {
      return ['🎯 For You', ...primaryNiches]
    }
    return primaryNiches
  }, [hasTargetField])

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

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          lead.title.toLowerCase().includes(query) ||
          lead.signalContext.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.category.toLowerCase().includes(query) ||
          (lead.niche && lead.niche.toLowerCase().includes(query)) ||
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
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        break
    }

    return result
  }, [leadsList, activeNiche, userServices, searchQuery, selectedTags, sortBy])

  const selectedLead = leadsList.find((l) => l.id === selectedLeadId)

  return (
    <main
      data-lenis-prevent
      className="flex-1 h-full min-h-0 overflow-y-auto px-8 py-8 pb-32 relative scrollbar-hide"
    >
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-purple-medium pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 mt-2">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1 w-full">
            <div className="flex items-center gap-4 shrink-0">
              <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Lead Feed</h1>
            </div>

            <div className="relative group flex-1 w-full">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-accent-purple/20 via-accent-mint/20 to-accent-mint/20 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-code-bg/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1.5 shadow-lg focus-within:ring-1 focus-within:ring-white/20 transition-all">
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
                    className="px-2 text-[11px] font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-widest">
                    ⌘K
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 flex items-center gap-3 w-full md:w-auto justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#1b1c1d] border border-white/[0.08] rounded-xl p-1 shadow-lg shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                type="button"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                title="Classic Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                type="button"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'pipeline'
                    ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                title="Pipeline Card View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v13.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </button>
            </div>

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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-code-bg/80 backdrop-blur-xl border shadow-lg text-[13px] font-medium transition-all ${
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
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-surface-elevated border border-white/[0.08] p-4 shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        Filter by Tags
                      </span>
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="text-[11px] font-medium text-accent-purple hover:underline"
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
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-200 ${
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
            const isForYou = niche === '🎯 For You'
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
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--rgb-primary),0.25)]'
                      : 'bg-accent-purple/10 border-accent-purple text-accent-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : isForYou
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15 hover:border-primary/50'
                      : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                }`}
              >
                <span>{niche}</span>
              </button>
            )
          })}
        </div>

        {/* Personalized Target Field Banner */}
        {hasTargetField && activeNiche === '🎯 For You' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/25 mb-6 text-xs transition-all">
            <div className="flex items-center gap-2 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span>
                Showing leads tailored to your onboarding target field:{' '}
                <strong className="text-primary font-semibold">
                  {userServices.join(', ')}
                </strong>
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
          className={`grid gap-6 transition-all duration-300 ${selectedLeadId ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}
        >
          <div className={selectedLeadId ? 'lg:col-span-2' : 'col-span-1'}>
            <div
              className={`grid gap-4 auto-rows-fr items-stretch transition-all duration-300 ${
                selectedLeadId
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
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
                      onClick={() => setSelectedLeadId(lead.id)}
                      onSaveToggle={(isSaved) => handleSaveToggle(lead.id, isSaved)}
                      onReveal={(leadId, name, email, phone) => {
                        setLeadsList((prev) =>
                          prev.map((l) =>
                            l.id === leadId
                              ? { ...l, isRevealed: true, isSaved: true, status: 'saved', name, email, phone }
                              : l,
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
                      onClick={() => setSelectedLeadId(lead.id)}
                      onSaveToggle={(isSaved) => handleSaveToggle(lead.id, isSaved)}
                      onReveal={(leadId, name, email, phone) => {
                        setLeadsList((prev) =>
                          prev.map((l) =>
                            l.id === leadId
                              ? { ...l, isRevealed: true, isSaved: true, status: 'saved', name, email, phone }
                              : l,
                          ),
                        )
                      }}
                    />
                  )
                )
              )}
            </div>
          </div>

          <AnimatePresence>
            {selectedLead && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="hidden lg:block lg:col-span-1 h-[calc(100vh-160px)] sticky top-0"
              >
                <LeadDrawer
                  lead={selectedLead}
                  onClose={() => setSelectedLeadId(null)}
                  onReveal={(name, email, phone) => {
                    setLeadsList((prev) =>
                      prev.map((l) =>
                        l.id === selectedLead.id
                          ? { ...l, isRevealed: true, isSaved: true, status: 'saved', name, email, phone }
                          : l,
                      ),
                    )
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
