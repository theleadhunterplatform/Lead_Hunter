'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import AppSidebar from '@/components/layout/AppSidebar'
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

export default function LeadsPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeNiche, setActiveNiche] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('pipeline')

  const [leadsList, setLeadsList] = useState<AppLead[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const token = await getFirebaseToken()
      const res = await fetch('/api/leads?pageSize=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json.data) {
        setLeadsList(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err)
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
    new Set(leadsList.filter((l) => l.status === 'new').flatMap((l) => l.nicheTags)),
  )

  const filteredLeads = useMemo(() => {
    let result = leadsList.filter((lead) => {
      if (lead.status !== 'new') return false
      if (activeNiche !== 'All') {
        if (!lead.niches || !lead.niches.includes(activeNiche)) return false
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
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
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        break
    }

    return result
  }, [leadsList, activeNiche, searchQuery, selectedTags, sortBy])

  const selectedLead = leadsList.find((l) => l.id === selectedLeadId)

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 pb-32 relative scrollbar-hide">
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
                  <div className="fixed inset-0 z-45" onClick={() => setIsFilterOpen(false)} />
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
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1 scrollbar-hide">
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
          className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 md:-mx-0 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {primaryNiches.map((niche) => {
            const isActive = activeNiche === niche
            return (
              <button
                key={niche}
                onClick={() => setActiveNiche(niche)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-accent-purple/10 border-accent-purple text-accent-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                }`}
              >
                {niche}
              </button>
            )
          })}
        </div>

        <div
          className={`grid gap-6 transition-all duration-300 ${selectedLeadId ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}
        >
          <div className={selectedLeadId ? 'lg:col-span-2' : 'col-span-1'}>
            <div
              className={`grid gap-5 auto-rows-[minmax(280px,auto)] transition-all duration-300 ${
                selectedLeadId
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {loading ? (
                <div className="col-span-full">
                  <CustomLoader page="leads" />
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
                filteredLeads.map((lead) =>
                  viewMode === 'pipeline' ? (
                    <PipelineLeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={lead.id === selectedLeadId}
                      onClick={() => setSelectedLeadId(lead.id)}
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
                      isSelected={lead.id === selectedLeadId}
                      onClick={() => setSelectedLeadId(lead.id)}
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
                          ? { ...l, isRevealed: true, name, email, phone }
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
