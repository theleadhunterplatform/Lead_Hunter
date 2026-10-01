'use client'

import Image from 'next/image'
import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  BookmarkIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon,
  Squares2X2Icon,
  LifebuoyIcon,
  PlusIcon,
  BookOpenIcon,
  BanknotesIcon,
  XMarkIcon,
  SparklesIcon,
  StarIcon,
  CheckIcon,
  ShareIcon,
  Square2StackIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { AppLead } from '@/types/lead'
import PipelineLeadCard from '@/app/leads/components/PipelineLeadCard'
import AppSidebar from '@/components/layout/AppSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Select, Badge, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

// ─── Demo data (ALL hardcoded — zero API calls in this file) ─────────────────
const allLeads: AppLead[] = [
  {
    id: 'hero-1',
    name: 'Andy Shepard',
    email: 'a.shepard@gmail.com',
    phone: '+1 (555) 012-3456',
    company: 'Nexus AI',
    source: 'LEAD HUNTER CLUB',
    category: 'SHOPIFY DESIGN',
    title: 'Shopify Designer - eCommerce Conversion',
    signalContext:
      'Struggling with slow load times and high bounce rates on their current Shopify store.',
    role: 'Shopify Designer / Freelancer',
    taskScope: 'Design engaging, high-converting Shopify storefronts for eCommerce brands',
    mustHave: 'Shopify storefront design expertise + strong UI/UX + conversion focus',
    nicheBonus: 'eCommerce design expertise + team collaboration + portfolio + proven results',
    buyerType: 'eCommerce Brand / Shopify Store',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['Storefront Design', 'High-Converting', 'Freelance'],
    hashtags: ['#shopify', '#design', '#ecommerce', '#conversion', '#storefront', '#freelance'],
    replyProbability: 92,
    status: 'saved',
    timestamp: '2h ago',
    niches: ['Web Design', 'Web Dev', 'Design'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'hero-2',
    name: 'Emily Thompson',
    email: 'e.thompson@vanguard.io',
    phone: '+1 (555) 017-8892',
    company: 'Vanguard Group',
    source: 'LEAD HUNTER CLUB',
    category: 'PERFORMANCE MARKETING',
    title: 'Media Buyer - Meta & TikTok Scaling',
    signalContext: 'Scaling ad spend for Q4 but CAC is getting wildly unprofitable.',
    role: 'Performance Marketer / Agency',
    taskScope: 'Manage and scale paid acquisition across Meta and TikTok for DTC brands',
    mustHave: 'Proven track record scaling $50k+ monthly ad spend + creative strategy',
    nicheBonus: 'Experience in health & wellness DTC + UGC sourcing',
    buyerType: 'DTC Brand / 8-figure Run Rate',
    urgency: 'medium',
    winProb: 'medium',
    nicheTags: ['DTC', 'Paid Ads', 'Scaling'],
    hashtags: ['#performance', '#media', '#dtc', '#ads', '#scaling', '#tiktok'],
    replyProbability: 85,
    status: 'drafting',
    timestamp: '5h ago',
    niches: ['Marketing'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'hero-3',
    name: 'Michael Carter',
    email: 'm.carter@stellar.co',
    phone: '+1 (555) 019-2045',
    company: 'Stellar Co',
    source: 'LEAD HUNTER CLUB',
    category: 'BRAND IDENTITY',
    title: 'Brand Designer - SaaS Rebrand',
    signalContext: 'Just raised seed round, looking to completely rebrand before product launch.',
    role: 'Brand Designer / Agency',
    taskScope: 'End-to-end visual identity revamp including logo, typography, and web assets',
    mustHave: 'B2B SaaS portfolio + modern minimal aesthetic + strict timeline management',
    nicheBonus: 'Motion design capabilities + Webflow experience',
    buyerType: 'Funded SaaS Startup',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['SaaS', 'Branding', 'Design'],
    hashtags: ['#saas', '#branding', '#design', '#identity', '#startup'],
    replyProbability: 88,
    status: 'saved',
    timestamp: '1d ago',
    niches: ['Design'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: true,
  },
  {
    id: 'hero-4',
    name: 'David Anderson',
    email: 'd.anderson@prism.io',
    phone: '+1 (555) 014-9921',
    company: 'Prism Labs',
    source: 'LEAD HUNTER CLUB',
    category: 'SALES INFRASTRUCTURE',
    title: 'RevOps Specialist - Outbound Setup',
    signalContext: 'Just hired 3 new SDRs. Clear indicator they need outbound infrastructure.',
    role: 'RevOps Consultant / B2B',
    taskScope: 'Build and automate Apollo/Clay outbound sequences for a new SDR team',
    mustHave: 'Deep Apollo/Clay knowledge + deliverability setup + CRM integration',
    nicheBonus: 'Sales coaching experience + customized scripting',
    buyerType: 'B2B Services / Agency',
    urgency: 'medium',
    winProb: 'high',
    nicheTags: ['B2B', 'Sales', 'Systems'],
    hashtags: ['#revops', '#sales', '#outbound', '#apollo', '#clay'],
    replyProbability: 75,
    status: 'new',
    timestamp: '3d ago',
    niches: ['Sales & RevOps', 'AI & Automation'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'hero-5',
    name: 'Sophia Patel',
    email: 'sophia@hyperflow.dev',
    phone: '+1 (555) 018-4433',
    company: 'Hyperflow Systems',
    source: 'LEAD HUNTER CLUB',
    category: 'NEXT.JS FULLSTACK',
    title: 'Fullstack Dev - Web Vitals & Realtime Architecture',
    signalContext:
      'Core Web Vitals failing on mobile and real-time dashboard dropping WebSocket connections.',
    role: 'Fullstack Engineer / Contractor',
    taskScope:
      'Audit Next.js App Router performance, optimize SSR caching, and stabilize realtime WebSocket backend',
    mustHave: 'Next.js 14/15 expertise + TailwindCSS + Supabase / PostgreSQL realtime',
    nicheBonus: 'Experience migrating large SaaS frontends to Turbopack',
    buyerType: 'Series A Tech Company',
    urgency: 'critical',
    winProb: 'high',
    nicheTags: ['Next.js', 'Web Vitals', 'Fullstack'],
    hashtags: ['#nextjs', '#react', '#fullstack', '#webvitals', '#typescript'],
    replyProbability: 96,
    status: 'new',
    timestamp: '1h ago',
    niches: ['Web Dev', 'Development'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'hero-6',
    name: 'Marcus Vance',
    email: 'marcus@growthvelocity.co',
    phone: '+1 (555) 016-7789',
    company: 'Velocity Media',
    source: 'LEAD HUNTER CLUB',
    category: 'SEO & PROGRAMMATIC',
    title: 'Senior SEO Strategist - Programmatic Organic Growth',
    signalContext:
      'Competitor launched programmatic directory taking 40k organic visits/mo. Need counter strategy.',
    role: 'SEO Consultant / Growth Agency',
    taskScope:
      'Architect programmatic SEO engine and content clustering to dominate competitor search terms',
    mustHave: 'Programmatic SEO track record + indexing experience + Ahrefs/Semrush mastery',
    nicheBonus: 'Python scripting for automated keyword cluster mapping',
    buyerType: 'Fast-growing Fintech',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['SEO', 'Programmatic', 'Organic Growth'],
    hashtags: ['#seo', '#growth', '#organic', '#rankings', '#content'],
    replyProbability: 91,
    status: 'new',
    timestamp: '3h ago',
    niches: ['SEO', 'Marketing'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
]

// Extra pipeline-only leads (Saved Leads table) — never shown in the Lead Feed
const extraPipelineLeads: AppLead[] = [
  {
    id: 'hero-7',
    name: 'Rachel Kim',
    email: 'rachel@northwind.studio',
    phone: '+1 (555) 013-7742',
    company: 'Northwind Studio',
    source: 'LEAD HUNTER CLUB',
    category: 'CONTENT STRATEGY',
    title: 'Content Strategist - B2B SaaS Newsletter',
    signalContext: 'Launching a weekly newsletter engine to feed inbound demos.',
    role: 'Content Strategist / Freelancer',
    taskScope: 'Own editorial calendar, ghostwriting, and lifecycle email sequences',
    mustHave: 'B2B SaaS writing portfolio + editorial ops experience',
    nicheBonus: 'SEO content background + basic design skills',
    buyerType: 'Seed-stage SaaS',
    urgency: 'medium',
    winProb: 'medium',
    nicheTags: ['Content', 'B2B', 'Newsletter'],
    hashtags: ['#content', '#b2b', '#newsletter'],
    replyProbability: 79,
    status: 'replied',
    timestamp: '6h ago',
    niches: ['Copywriting', 'Marketing'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: true,
  },
  {
    id: 'hero-8',
    name: 'Owen Brooks',
    email: 'owen@fintrack.io',
    phone: '+1 (555) 011-2288',
    company: 'FinTrack',
    source: 'LEAD HUNTER CLUB',
    category: 'MOBILE APP DESIGN',
    title: 'iOS/Android Designer - Fintech App Revamp',
    signalContext: 'App store reviews cite confusing navigation and dated visual language.',
    role: 'Product Designer / Agency',
    taskScope: 'Redesign core flows (onboarding, dashboard, transfers) for both platforms',
    mustHave: 'Fintech app case studies + design systems experience',
    nicheBonus: 'Motion prototypes + accessibility expertise',
    buyerType: 'Series B Fintech',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['Mobile', 'Fintech', 'UI/UX'],
    hashtags: ['#mobile', '#fintech', '#ux'],
    replyProbability: 87,
    status: 'sent',
    timestamp: '8h ago',
    niches: ['Design', 'Development'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: true,
  },
  {
    id: 'hero-9',
    name: 'Priya Nair',
    email: 'priya@loopcreative.agency',
    phone: '+1 (555) 015-6014',
    company: 'Loop Creative',
    source: 'LEAD HUNTER CLUB',
    category: 'VIDEO EDITING',
    title: 'Video Editor - Short-form Ad Creative',
    signalContext: 'Doubling spend on UGC ads but creative pipeline can’t keep pace.',
    role: 'Video Editor / Freelancer',
    taskScope: 'Cut 15-30s paid social variants from raw UGC weekly',
    mustHave: 'Paid social portfolio + fast turnaround cadence',
    nicheBonus: 'Motion graphics + hook testing frameworks',
    buyerType: 'DTC Ecommerce Brand',
    urgency: 'medium',
    winProb: 'high',
    nicheTags: ['Video', 'Ads', 'UGC'],
    hashtags: ['#video', '#ugc', '#ads'],
    replyProbability: 82,
    status: 'follow-up',
    timestamp: '12h ago',
    niches: ['Marketing', 'Design'],
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
]

const SAVED_STATUSES = ['saved', 'drafting', 'sent', 'replied', 'follow-up']

const dashboardStats = [
  { label: 'Analyzed Leads', value: '1,284', trend: '+12%', trendUp: true },
  { label: 'Active Conversations', value: '42', trend: '+5', trendUp: true },
  { label: 'Avg. Reply Probability', value: '84%', trend: '+2.4%', trendUp: true },
  { label: 'Credits Remaining', value: '750', trend: '/ 1,000', trendUp: false },
]

const activityData = [
  { day: 'Mon', value: 45 },
  { day: 'Tue', value: 52 },
  { day: 'Wed', value: 38 },
  { day: 'Thu', value: 65 },
  { day: 'Fri', value: 48 },
  { day: 'Sat', value: 32 },
  { day: 'Sun', value: 28 },
]

const distributionData = [
  { label: 'Design', count: 412, color: 'purple' },
  { label: 'Development', count: 388, color: 'mint' },
  { label: 'Marketing', count: 274, color: 'orange' },
  { label: 'SEO', count: 210, color: 'pink' },
]

const supportTickets = [
  {
    id: 'TCK-1042',
    subject: 'Credits not reflected after upgrade',
    category: 'Billing',
    priority: 'High',
    status: 'OPEN',
    createdAt: '2h ago',
    messages: 3,
  },
  {
    id: 'TCK-1039',
    subject: 'CSV export missing phone column',
    category: 'Leads',
    priority: 'Normal',
    status: 'IN_PROGRESS',
    createdAt: '1d ago',
    messages: 5,
  },
  {
    id: 'TCK-1031',
    subject: 'How do rollover credits expire?',
    category: 'General',
    priority: 'Low',
    status: 'RESOLVED',
    createdAt: '3d ago',
    messages: 2,
  },
  {
    id: 'TCK-1028',
    subject: 'Google Sheets sync asks for re-auth',
    category: 'Technical',
    priority: 'Urgent',
    status: 'CLOSED',
    createdAt: '5d ago',
    messages: 8,
  },
]

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
type SectionProps = { onNavigate: (href: string) => void }
const ease = [0.16, 1, 0.3, 1] as const

const SAVED_STATUS_LABEL: Record<string, string> = {
  saved: 'Saved',
  new: 'Saved',
  drafting: 'Drafting',
  sent: 'Sent',
  'follow-up': 'Follow-up',
  replied: 'Replied',
}

function stageFor(status: string) {
  if (status === 'replied') return 'replied'
  if (status === 'sent' || status === 'follow-up') return 'contacted'
  return 'saved'
}

// ─── Real Lead Feed section (mirrors /leads) ────────────────────────────────
function LeadsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeNiche, setActiveNiche] = useState('All')

  const allTags = useMemo(() => Array.from(new Set(allLeads.flatMap((l) => l.nicheTags ?? []))), [])

  const filteredLeads = useMemo(() => {
    let result = [...allLeads]

    if (!activeNiche || activeNiche === 'All') {
      // keep all
    } else {
      const target = activeNiche.toLowerCase().trim()
      result = result.filter((lead) => {
        const leadNiche = (lead.category || '').toLowerCase().trim()
        const niches = (lead.niches || []).map((n) => n.toLowerCase().trim())
        const tags = (lead.nicheTags || []).map((t) => t.toLowerCase().trim())
        return (
          leadNiche === target ||
          niches.includes(target) ||
          niches.some((n) => n.includes(target)) ||
          tags.some((t) => t.includes(target))
        )
      })
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.title.toLowerCase().includes(query) ||
          lead.signalContext.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.category.toLowerCase().includes(query) ||
          lead.nicheTags.some((tag) => tag.toLowerCase().includes(query)) ||
          (lead.niches && lead.niches.some((n) => n.toLowerCase().includes(query))),
      )
    }

    if (selectedTags.length > 0) {
      result = result.filter((lead) => selectedTags.some((tag) => lead.nicheTags.includes(tag)))
    }

    switch (sortBy) {
      case 'replyProbability':
        result = [...result].sort((a, b) => b.replyProbability - a.replyProbability)
        break
      case 'urgency': {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>
        result = [...result].sort((a, b) => (weights[b.urgency] ?? 0) - (weights[a.urgency] ?? 0))
        break
      }
      case 'newest':
      default:
        // dummy timestamps are relative strings — keep curated newest-first order
        break
    }

    return result
  }, [searchQuery, selectedTags, activeNiche, sortBy])

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.length > 0 || activeNiche !== 'All'

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 relative w-full scrollbar-hide"
    >
      <div className="w-full max-w-[1400px] mx-auto relative z-10">
        {/* Header — mirrors real /leads header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 mt-2">
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
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1 scrollbar-hide">
                      {allTags.map((tag) => {
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
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Niche Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {primaryNiches.map((niche) => {
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

        {/* Lead grid — real default view: PipelineLeadCard */}
        <div className="grid gap-4 auto-rows-fr items-stretch transition-all duration-300 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-secondary/20 border border-white/[0.04] rounded-3xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-text-secondary">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-text-secondary" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">No signals found</h3>
              <p className="text-sm text-text-secondary/70 max-w-sm">
                Try clearing your search query or selected tags to view more opportunities.
              </p>
              {hasActiveFilters && (
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
            filteredLeads.map((lead, index) => (
              <PipelineLeadCard key={lead.id} lead={lead} index={index} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Real Saved Leads section (mirrors /saved) ──────────────────────────────
function SavedContent() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('All Leads')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})

  const baseLeads = useMemo(() => [...allLeads, ...extraPipelineLeads], [])
  const leads = useMemo(
    () =>
      baseLeads
        .filter((l) => SAVED_STATUSES.includes(l.status))
        .map((l) => ({ ...l, status: statusOverrides[l.id] ?? l.status })),
    [baseLeads, statusOverrides],
  )

  const filteredLeads = useMemo(() => {
    let result = leads
    if (activeTab === 'In Progress') {
      result = result.filter((l) => ['drafting', 'sent', 'follow-up'].includes(l.status))
    } else if (activeTab === 'Archived') {
      result = []
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q),
      )
    }
    return result
  }, [leads, activeTab, searchTerm])

  const replyCount = leads.filter((l) => l.status === 'replied').length
  const activeCount = leads.filter((l) => ['drafting', 'sent', 'follow-up'].includes(l.status)).length
  const readyCount = leads.filter((l) => l.status === 'saved' || l.status === 'new').length
  const priorityCount = leads.filter((l) => l.urgency === 'critical' || l.urgency === 'high').length

  const summaryCards = [
    { label: 'Reply Received', sub: 'Awaiting negotiation', count: `${replyCount} Leads`, accent: 'purple', icon: ChatBubbleLeftRightIcon },
    { label: 'Active Conversations', sub: 'Currently being contacted', count: `${activeCount} Leads`, accent: 'purple', icon: ArrowPathIcon },
    { label: 'Ready to Contact', sub: 'Unlocked & waiting', count: `${readyCount} Leads`, accent: 'mint', icon: BoltIcon },
    { label: 'High Priority Targets', sub: 'Critical & High Urgency', count: `${priorityCount} Leads`, accent: 'purple', icon: ExclamationTriangleIcon },
  ]

  const markStatus = (id: string, status: string, label: string) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }))
    setOpenMenuId(null)
    addToast({ type: 'success', message: `Marked as ${label}` })
  }

  const copyToClipboard = (text: string, kind: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined)
    }
    addToast({ type: 'success', message: `${filteredLeads.length} leads copied as ${kind}` })
    setExportOpen(false)
  }

  const exportAs = (delimiter: string, kind: string) => {
    const header = ['Name', 'Email', 'Company', 'Status', 'Urgency', 'Reply Probability']
    const rows = filteredLeads.map((l) =>
      [l.name, l.email, l.company, l.status, l.urgency, `${l.replyProbability}%`].join(delimiter),
    )
    copyToClipboard([header.join(delimiter), ...rows].join('\n'), kind)
  }

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 relative scrollbar-hide"
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="group relative p-5 metallic-card transition-all duration-300 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-2xl bg-accent-${card.accent}/10 text-accent-${card.accent} shadow-inner`}>
                  <card.icon className="w-[22px] h-[22px]" />
                </div>
                <span className={`text-xxs font-bold uppercase tracking-widest text-accent-${card.accent}`}>
                  {card.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">{card.label}</h3>
              <p className="text-xs text-text-secondary mt-1">{card.sub}</p>
              <div
                className={`absolute bottom-0 left-0 w-full h-1 bg-accent-${card.accent}/20 group-hover:bg-accent-${card.accent}/40 transition-all`}
              />
            </div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 shrink-0">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3 whitespace-nowrap shrink-0">
              <BookmarkIcon className="w-6 h-6 text-text-secondary" />
              Saved Leads
            </h2>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
              {['All Leads', 'In Progress', 'Archived'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-11 font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? 'bg-accent-purple text-text-on-accent shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 min-h-[44px] pl-10 pr-4 text-xs focus:outline-none focus:border-border-subtle transition-all w-48 sm:w-60 focus:w-64 text-text-primary placeholder:text-text-secondary/60"
              />
            </div>

            <Button
              variant="outline"
              color="mint"
              size="sm"
              className="min-h-[44px]"
              onClick={() => addToast({ type: 'info', message: 'Sheet sync is disabled in this preview' })}
            >
              <ArrowPathIcon className="w-3 h-3" />
              Sync from Sheet
            </Button>

            <div className="relative">
              <Button
                variant="primary"
                color="mint"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setExportOpen((o) => !o)}
              >
                <DocumentArrowDownIcon className="w-3 h-3" />
                Export
                <ChevronDownIcon className="w-3 h-3" />
              </Button>

              {exportOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-elevated border border-white/10 shadow-2xl shadow-black/40 overflow-hidden z-50">
                  <button
                    onClick={() => exportAs(',', 'CSV')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="w-4 h-4 text-accent-mint shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Copy as CSV</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">
                        Comma-separated · Universal format
                      </span>
                    </span>
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={() => exportAs('\t', 'TSV')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="w-4 h-4 text-accent-purple shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Copy as TSV</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">
                        Tab-separated · Paste into Sheets/Excel
                      </span>
                    </span>
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={() => {
                      setExportOpen(false)
                      addToast({ type: 'info', message: 'Sheet download is disabled in this preview' })
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 text-accent-mint shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Download Sheet</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">
                        Formatted .xlsx · Headers, filters, frozen row
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="metallic-card min-h-[360px] pb-10 relative">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-text-secondary text-sm">No leads match this view.</p>
              {activeTab !== 'All Leads' && (
                <button
                  onClick={() => setActiveTab('All Leads')}
                  className="mt-3 text-accent-mint text-xs hover:underline"
                >
                  View all leads
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-12 gap-4 px-6 sm:px-8 py-4 border-b border-white/[0.05] text-xxs font-bold text-text-secondary uppercase tracking-super">
                  <div className="col-span-1">Status</div>
                  <div className="col-span-4">Lead</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Urgency</div>
                  <div className="col-span-3 text-right pr-2">Actions</div>
                </div>

                <div className="divide-y divide-white/[0.03]">
                  {filteredLeads.map((lead) => {
                    const isMenuOpen = openMenuId === lead.id
                    return (
                      <div
                        key={lead.id}
                        className="grid grid-cols-12 gap-4 px-6 sm:px-8 py-4 items-center group hover:bg-white/[0.02] transition-colors relative z-10"
                      >
                        <div className="col-span-1 flex items-center self-stretch">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              lead.status === 'replied' || lead.status === 'sent' || lead.status === 'follow-up'
                                ? 'bg-accent-purple'
                                : 'bg-accent-mint'
                            }`}
                          />
                        </div>

                        <div className="col-span-4 flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full border flex items-center justify-center text-11 font-bold overflow-hidden shrink-0 ${
                              lead.isRevealed
                                ? 'bg-surface-elevated border-white/10 text-text-primary'
                                : 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple'
                            }`}
                          >
                            {lead.isRevealed
                              ? lead.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                              : '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-text-primary truncate">
                              {lead.isRevealed ? lead.name : lead.title || lead.category}
                            </div>
                            <div className="text-xxs text-text-secondary truncate">
                              {lead.isRevealed ? lead.email : lead.company}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <Badge size="sm" color={lead.status === 'replied' ? 'purple' : 'mint'}>
                            {SAVED_STATUS_LABEL[lead.status] ?? lead.status}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              size="sm"
                              color={lead.urgency === 'critical' || lead.urgency === 'high' ? 'mint' : 'purple'}
                            >
                              {lead.urgency}
                            </Badge>
                            {lead.replyProbability > 0 && (
                              <span className="text-xxs text-text-secondary">{lead.replyProbability}%</span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-3 text-right flex items-center justify-end relative pr-2">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(isMenuOpen ? null : lead.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold border transition-all ${
                                isMenuOpen
                                  ? 'bg-white/15 text-text-primary border-primary/40 shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary border-white/10'
                              }`}
                              aria-expanded={isMenuOpen}
                            >
                              <BookmarkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{SAVED_STATUS_LABEL[lead.status] ?? 'Actions'}</span>
                              <ChevronDownIcon
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isMenuOpen ? 'rotate-180 text-primary' : 'text-text-secondary'
                                }`}
                              />
                            </button>

                            {isMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div
                                  role="menu"
                                  className="absolute right-0 mt-2 w-52 rounded-2xl bg-surface-elevated/95 border border-white/10 shadow-2xl shadow-black/80 py-2 z-50 text-left backdrop-blur-xl"
                                >
                                  <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary/70">
                                    Stage / Status
                                  </div>
                                  {[
                                    { status: 'saved', label: 'Saved', icon: BookmarkIcon },
                                    { status: 'drafting', label: 'Drafting', icon: PencilIcon },
                                    { status: 'sent', label: 'Sent', icon: PaperAirplaneIcon },
                                    { status: 'follow-up', label: 'Follow-up', icon: ArrowPathIcon },
                                    { status: 'replied', label: 'Replied', icon: ChatBubbleLeftRightIcon },
                                  ].map((item) => (
                                    <button
                                      key={item.status}
                                      type="button"
                                      onClick={() => markStatus(lead.id, item.status, item.label)}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                        lead.status === item.status
                                          ? 'text-primary font-semibold bg-primary/10'
                                          : 'text-text-primary'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <item.icon
                                          className={`w-3.5 h-3.5 shrink-0 ${lead.status === item.status ? 'text-primary' : 'text-text-secondary'}`}
                                        />
                                        Mark as {item.label}
                                      </span>
                                      {lead.status === item.status && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Real Dashboard section (mirrors /dashboard) ────────────────────────────
function DashboardContent({ onNavigate }: SectionProps) {
  const [selectedBar, setSelectedBar] = useState<string | null>(null)
  const maxActivity = Math.max(...activityData.map((a) => a.value))

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Operational Overview
          </h1>
          <p className="text-text-secondary mt-2">
            Welcome back. Here is your pipeline at a glance.
          </p>
        </div>

        <div className="metallic-card overflow-hidden mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardStats.map((stat, i) => {
              const isLast = i === dashboardStats.length - 1
              const classes = [
                'p-5 sm:p-6',
                !isLast && 'border-b border-white/[0.06]',
                i % 2 === 0 && 'sm:border-r sm:border-white/[0.06]',
                'lg:border-b-0',
                !isLast && 'lg:border-r lg:border-white/[0.06]',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div key={stat.label} className={classes}>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                    {stat.label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold tabular-nums tracking-tight ${
                        stat.label === 'Credits Remaining' ? 'text-primary' : 'text-white'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span
                        className={`text-[11px] font-bold ${stat.trendUp ? 'text-secondary' : 'text-text-secondary'}`}
                      >
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 metallic-card p-5 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Conversion Velocity
                </h3>
                <p className="text-sm text-text-secondary">Activity over the last 7 days</p>
              </div>
            </div>

            <div className="h-[180px] flex items-end justify-between gap-2 sm:gap-4">
              {activityData.map((data) => {
                const heightPercent = (data.value / maxActivity) * 100
                const isBarOpen = selectedBar === data.day
                return (
                  <div
                    key={data.day}
                    role="button"
                    tabIndex={0}
                    aria-label={`${data.day}: ${data.value} actions`}
                    onClick={() => setSelectedBar(isBarOpen ? null : data.day)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedBar(isBarOpen ? null : data.day)
                      }
                    }}
                    className="flex-1 flex flex-col items-center gap-4 group cursor-pointer min-w-[36px]"
                  >
                    <div
                      style={{
                        height: `${Math.max(heightPercent * 1.6, 4)}px`,
                        transition: 'height 400ms ease',
                      }}
                      className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-accent-mint/10 to-accent-mint/40 group-hover:to-accent-mint/60 transition-all relative"
                    >
                      <div
                        className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-opacity text-xxs font-bold text-text-secondary bg-surface-elevated px-2 py-1 rounded border border-border-subtle whitespace-nowrap ${
                          isBarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {data.value} actions
                      </div>
                    </div>
                    <span className="text-xxs font-bold text-text-secondary uppercase tracking-widest">
                      {data.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 sm:p-8 rounded-4xl bg-accent-mint text-text-on-accent relative overflow-hidden group">
              <h3 className="text-xl font-bold mb-2">Revealed Leads</h3>
              <p className="text-sm opacity-80 mb-6 leading-relaxed">
                You have 6 high-intent leads revealed and ready to work. Save them to your pipeline
                or export as CSV/Excel.
              </p>
              <button
                onClick={() => onNavigate('/leads')}
                className="w-full py-4 bg-text-on-accent text-accent-mint font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                Review New Leads
                <ArrowTopRightOnSquareIcon className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="metallic-card p-5 sm:p-8">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4">
                Lead Distribution
              </h3>
              <div className="space-y-4">
                {distributionData.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    <span className={`text-xxs font-bold uppercase tracking-widest text-accent-${item.color}`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Real Support Center section (mirrors /support) ─────────────────────────
function SupportContent({ onNavigate }: SectionProps) {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED_CLOSED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')

  const counts = {
    total: supportTickets.length,
    open: supportTickets.filter((t) => t.status === 'OPEN').length,
    inProgress: supportTickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolvedClosed: supportTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
  }

  const filteredTickets = supportTickets.filter((t) => {
    if (activeTab === 'OPEN' && t.status !== 'OPEN') return false
    if (activeTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false
    if (activeTab === 'RESOLVED_CLOSED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return t.subject.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    }
    return true
  })

  const tabClass = (isActive: boolean) =>
    `px-3.5 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
      isActive ? 'bg-accent-orange text-black shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
    }`

  const resourceCards = [
    {
      title: 'Lead Intelligence Guides',
      desc: 'How buyer intent signals are calculated, filtered, and saved.',
      icon: BookOpenIcon,
      onClick: () => onNavigate('/leads'),
    },
    {
      title: 'Billing & Credits FAQ',
      desc: 'Learn about credit rollovers, quota resets, and invoices.',
      icon: BanknotesIcon,
      // Pricing section was removed from the demo — route to the credits overview instead.
      onClick: () => onNavigate('/dashboard'),
    },
    {
      title: 'Dedicated Support Team',
      desc: 'Submit a question or bug report for rapid response.',
      icon: ChatBubbleLeftRightIcon,
      onClick: () => setCreateOpen(true),
    },
  ]

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <ChevronRightIcon className="w-3 h-3 text-text-secondary/40" />
          <span className="text-text-primary font-medium flex items-center gap-1.5">
            <LifebuoyIcon className="w-3.5 h-3.5 text-accent-orange" />
            Support Center
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shadow-[0_0_20px_rgba(var(--rgb-accent-orange),0.12)]">
              <LifebuoyIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  Support Center
                </h1>
                <Badge size="sm" color="mint">
                  {counts.total} tickets
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Submit requests, follow up with our team, or browse help resources.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/10 transition-colors"
            >
              <Squares2X2Icon className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <Button
              variant="primary"
              color="mint"
              size="sm"
              className="min-h-[44px]"
              onClick={() => setCreateOpen((o) => !o)}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </Button>
          </div>
        </div>

        {/* Quick Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {resourceCards.map((card) => (
            <button
              key={card.title}
              onClick={card.onClick}
              className="group relative p-5 metallic-card rounded-2xl border border-white/[0.06] hover:border-white/20 transition-all text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-accent-orange/10 text-accent-orange">
                  <card.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-orange transition-colors flex items-center justify-between">
                    <span>{card.title}</span>
                    <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-xxs text-text-secondary mt-1">{card.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New Ticket form (demo — local state only) */}
        <AnimatePresence>
          {createOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease }}
              className="overflow-hidden mb-6"
            >
              <div className="metallic-card p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">
                    New Ticket
                  </h3>
                  <button
                    onClick={() => setCreateOpen(false)}
                    className="p-2 rounded-lg text-text-secondary hover:bg-white/5 transition-colors"
                    aria-label="Close form"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                      Subject
                    </label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your issue"
                      className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-border-subtle transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-border-subtle transition-all"
                    >
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="leads">Leads</option>
                      <option value="account">Account</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-border-subtle transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what you need help with in detail..."
                      rows={3}
                      className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-border-subtle transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="primary"
                    color="mint"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => {
                      setCreateOpen(false)
                      setSubject('')
                      setMessage('')
                      addToast({ type: 'success', message: 'Ticket submitted (demo preview)' })
                    }}
                  >
                    Submit Ticket
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto scrollbar-hide">
            <button onClick={() => setActiveTab('ALL')} className={tabClass(activeTab === 'ALL')}>
              <span>All Tickets</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'ALL' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.total}
              </span>
            </button>
            <button onClick={() => setActiveTab('OPEN')} className={tabClass(activeTab === 'OPEN')}>
              <span>Open</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'OPEN' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.open}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={tabClass(activeTab === 'IN_PROGRESS')}
            >
              <span>In Progress</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'IN_PROGRESS' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.inProgress}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('RESOLVED_CLOSED')}
              className={tabClass(activeTab === 'RESOLVED_CLOSED')}
            >
              <span>Resolved</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'RESOLVED_CLOSED' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.resolvedClosed}
              </span>
            </button>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 min-h-[44px] pl-10 pr-4 text-xs w-full md:w-64 text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-border-subtle transition-all"
            />
          </div>
        </div>

        {/* Ticket list */}
        <div className="space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="metallic-card p-10 text-center">
              <p className="text-sm text-text-secondary">No tickets match this view.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const statusColor =
                ticket.status === 'OPEN'
                  ? 'mint'
                  : ticket.status === 'IN_PROGRESS'
                    ? 'purple'
                    : 'purple'
              return (
                <div
                  key={ticket.id}
                  className="metallic-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2 rounded-xl bg-accent-orange/10 text-accent-orange shrink-0">
                      <LifebuoyIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xxs text-text-secondary">
                        <span className="font-mono">{ticket.id}</span>
                        <span>·</span>
                        <span>{ticket.category}</span>
                        <span>·</span>
                        <span>{ticket.createdAt}</span>
                        <span>·</span>
                        <span>{ticket.messages} messages</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge size="sm" color={statusColor as 'mint' | 'purple'}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge size="sm" color={ticket.priority === 'Urgent' || ticket.priority === 'High' ? 'mint' : 'purple'}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Refer & Earn section (mirrors /referrals, dummy data) ──────────────────
function ReferralsContent() {
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const referralUrl = 'https://leadhunter.club/invite/ALEX-7X2F'
  const referralCode = 'ALEX-7X2F'

  const copy = (text: string, setCopiedFn: (v: boolean) => void) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined)
    }
    setCopiedFn(true)
    setTimeout(() => setCopiedFn(false), 2000)
    addToast({ type: 'success', message: 'Copied to clipboard' })
  }

  const stats = [
    { label: 'Friends Joined', value: '12', sub: 'Total signups via your link' },
    { label: 'Credits Earned', value: '+120', sub: '10 credits per referral' },
    { label: 'Pending Invites', value: '3', sub: 'Awaiting first login' },
  ]

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Invite Friends, Earn Platform Credits
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl">
            Give your peers an edge in cold outreach. When they sign up with your link, they get{' '}
            <strong className="text-white">+5 welcome credits</strong>, and you earn{' '}
            <strong className="text-primary">+10 credits</strong> directly into your balance.
          </p>
        </div>

        <div className="metallic-card p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShareIcon className="w-5 h-5 text-primary" />
                  Your Unique Invite Link
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Share this link anywhere — anyone who registers using it is automatically attributed
                  to you.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-surface-elevated/80 border border-white/10 px-3.5 py-1.5 rounded-xl w-fit">
                <span className="text-xs text-text-secondary">Code:</span>
                <span className="font-mono font-bold text-sm text-primary tracking-wider">
                  {referralCode}
                </span>
                <button
                  onClick={() => copy(referralCode, setCopiedCode)}
                  className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-white transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? (
                    <CheckCircleIcon className="w-4 h-4 text-secondary" />
                  ) : (
                    <Square2StackIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 bg-surface-elevated border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-text-primary font-mono select-all overflow-x-auto whitespace-nowrap">
                {referralUrl}
              </div>
              <button
                onClick={() => copy(referralUrl, setCopied)}
                className="shrink-0 bg-primary hover:bg-primary/90 text-black font-semibold rounded-2xl px-6 py-3.5 flex items-center justify-center gap-2 active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)]"
              >
                {copied ? (
                  <>
                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-black" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Square2StackIcon className="w-5 h-5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-text-secondary">Quick Share:</span>
              {['Twitter / X', 'WhatsApp', 'LinkedIn', 'Email'].map((channel) => (
                <button
                  key={channel}
                  onClick={() => addToast({ type: 'info', message: `Share sheet for ${channel} (demo)` })}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="metallic-card overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-5 ${i < stats.length - 1 ? 'border-b border-white/[0.06] sm:border-b-0 sm:border-r' : ''}`}
              >
                <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  {stat.label}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-primary tabular-nums tracking-tight">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-text-secondary">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Milestone Rewards section (mirrors /rewards, dummy data) ───────────────
function RewardsContent() {
  const { addToast } = useToast()
  const [selectedTier, setSelectedTier] = useState('call')

  const ledger = [
    { label: 'Credits Earned', value: '+240', accent: 'text-primary', sub: 'Added to your lead reveal balance' },
    { label: 'Verified Wins', value: '6', accent: 'text-secondary', sub: 'Milestone proofs approved by admin' },
    { label: 'Under Review', value: '1', accent: 'text-white', sub: 'Audited by admin within 24 hours' },
    { label: 'Top Bounty Tier', value: '+50 Credits', accent: 'text-white', sub: 'Per signed contract / paid client' },
  ]

  const tiers = [
    { id: 'call', title: 'Discovery Call Booked', reward: '+10 Credits', desc: 'Verified calendar invite or call screenshot' },
    { id: 'contract', title: 'Contract Signed', reward: '+30 Credits', desc: 'Signed SOW, retainer, or invoice paid' },
    { id: 'retainer', title: 'Retainer Closed', reward: '+50 Credits', desc: 'Recurring client engaged for 30+ days' },
  ]

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Turn Client Wins Into Free Credits
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl leading-relaxed">
            Close deals and book calls using Lead Hunter leads? Upload a quick screenshot of your win.
            When verified, you earn <strong className="text-primary">+10 to +50 bonus credits</strong>{' '}
            added directly into your reveal balance.
          </p>
        </div>

        <div className="metallic-card overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {ledger.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-5 border-b border-white/[0.06] lg:border-b-0 ${i < ledger.length - 1 ? 'sm:border-r lg:border-r' : ''}`}
              >
                <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  {stat.label}
                </div>
                <div className={`mt-2 text-3xl font-extrabold ${stat.accent} tabular-nums tracking-tight`}>
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-text-secondary">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              1. Select Milestone Category
            </h2>
            <span className="text-xs text-text-secondary">Click a tier to choose your proof bounty</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              const isSelected = selectedTier === tier.id
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-300 ${
                    isSelected
                      ? 'metallic-card ring-2 ring-primary/40'
                      : 'metallic-card ring-1 ring-white/[0.06] hover:ring-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrophyIcon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-text-secondary'}`} />
                      <span className="text-sm font-bold text-white">{tier.title}</span>
                    </div>
                    {isSelected && <CheckCircleIcon className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-text-secondary mb-3">{tier.desc}</p>
                  <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xxs font-bold text-primary uppercase tracking-wider">
                    {tier.reward}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">2. Submit Screenshot Proof</h2>
          <div
            onClick={() => addToast({ type: 'info', message: 'Uploads are disabled in this preview' })}
            className="metallic-card rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 transition-all p-8 text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              Drop your win screenshot here
            </p>
            <p className="text-xs text-text-secondary mt-1">
              PNG or JPG · Reviewed by admin within 24 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Community Wins section (mirrors /community, dummy data) ────────────────
function CommunityContent({ onNavigate }: SectionProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const stats = [
    { label: 'Verified Deals Closed', value: '38', accent: 'text-primary', sub: 'Signed client contracts & retainers' },
    { label: 'Meetings Booked', value: '57', accent: 'text-white', sub: 'Sales discovery calls scheduled' },
    { label: 'Total Verified Wins', value: '96', accent: 'text-secondary', sub: 'Total admin-approved social proofs' },
  ]

  const tabs = [
    { id: 'all', label: 'All Wins', icon: SparklesIcon },
    { id: 'deals', label: 'Deals Closed', icon: TrophyIcon },
    { id: 'meetings', label: 'Meetings', icon: ChatBubbleLeftRightIcon },
    { id: 'replies', label: 'Replies', icon: ArrowPathIcon },
  ]

  const posts = [
    {
      id: 'w1',
      category: 'deals',
      name: 'Jordan M.',
      handle: '@jordandev',
      time: '2d ago',
      content:
        'Closed a $4.2k/mo retainer with a SaaS client I found through the feed. The signal said they were hiring a design partner — I reached out in 20 minutes and had a call booked the same day.',
      badge: 'Contract Signed',
      likes: 124,
    },
    {
      id: 'w2',
      category: 'meetings',
      name: 'Sara L.',
      handle: '@saragrowth',
      time: '4d ago',
      content:
        '3 discovery calls booked this week from Lead Hunter signals. The reply probability ranking is scary accurate — the 90%+ tier replies almost every time.',
      badge: 'Discovery Calls',
      likes: 87,
    },
    {
      id: 'w3',
      category: 'replies',
      name: 'Devon K.',
      handle: '@devon.builds',
      time: '6d ago',
      content:
        'Warm reply from a funded startup CTO within 45 minutes of reaching out. Their signal mentioned Web Vitals issues — my proposal led with the audit checklist.',
      badge: 'First Reply',
      likes: 63,
    },
  ]

  const filteredPosts =
    selectedCategory === 'all' ? posts : posts.filter((p) => p.category === selectedCategory)

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Community Wins Hub
            </h1>
            <p className="text-sm md:text-base text-text-secondary max-w-2xl mt-1 leading-relaxed">
              Real contracts closed, discovery meetings booked, and warm outreach replies generated by
              Lead Hunter members. Curated and verified by platform administrators.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/rewards')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-white/[0.06] border border-white/[0.12] text-xs font-bold text-white transition-all group shrink-0 shadow-lg"
          >
            <span>Have a win to submit?</span>
            <span className="text-accent-mint flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Earn Bounty Credits <ArrowRightIcon className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>

        <div className="metallic-card overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-5 border-b border-white/[0.06] sm:border-b-0 ${i < stats.length - 1 ? 'sm:border-r' : ''}`}
              >
                <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  {stat.label}
                </div>
                <div className={`mt-2 text-3xl font-extrabold ${stat.accent} tabular-nums tracking-tight`}>
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-text-secondary">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.08]">
          {tabs.map((tab) => {
            const isActive = selectedCategory === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-black shadow-lg shadow-primary/20'
                    : 'metallic-card text-text-secondary hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="metallic-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {post.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{post.name}</div>
                    <div className="text-xxs text-text-secondary">
                      {post.handle} · {post.time}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-accent-mint/10 border border-accent-mint/25 text-xxs font-bold text-accent-mint uppercase tracking-wider shrink-0">
                  {post.badge}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05]">
                <span className="flex items-center gap-1.5 text-xxs text-text-secondary">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-accent-mint" />
                  Verified by admin
                </span>
                <span className="text-xxs text-text-secondary">♥ {post.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Settings section (mirrors /settings, dummy data) ───────────────────────
function SettingsContent() {
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('Alex Morgan')
  const [email, setEmail] = useState('alex@leadhunter.demo')

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[1000px] mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Settings</h1>
          <p className="text-text-secondary mt-2">Manage your account, credits, and subscription.</p>
        </div>

        <div className="space-y-6">
          <div className="metallic-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center font-bold text-text-secondary hover:text-text-primary transition-colors text-xl">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Profile</h2>
                  <p className="text-sm text-text-secondary">Your personal information</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditing) {
                    addToast({ type: 'success', message: 'Profile saved (demo preview)' })
                  }
                  setIsEditing(!isEditing)
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-accent-mint text-text-on-accent hover:brightness-110'
                    : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-border-subtle transition-all disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xxs font-bold uppercase tracking-widest text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-border-subtle transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="metallic-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Credits & Tokens</h2>
                <p className="text-sm text-text-secondary">Your current credit balance</p>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">750 / 1,000</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--rgb-primary),0.5)]"
                style={{ width: '75%' }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-text-secondary">
              <span>Renews monthly · Unused credits roll over for 15 days</span>
              <button
                onClick={() => addToast({ type: 'info', message: 'Refills open at checkout (demo)' })}
                className="text-primary font-bold hover:underline"
              >
                Refill Pipeline →
              </button>
            </div>
          </div>

          <div className="metallic-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Subscription</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Freelancer Pro · ₹999/month · Renews Apr 12
                </p>
              </div>
              <button
                onClick={() => addToast({ type: 'info', message: 'Plan management opens at checkout (demo)' })}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
              >
                Manage Plan
              </button>
            </div>
          </div>

          <div className="metallic-card p-6 sm:p-8 border border-red-500/20">
            <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-text-secondary">
                Permanently delete your account, leads, and credits.
              </p>
              <button
                onClick={() => addToast({ type: 'error', message: 'Account deletion is disabled in this preview' })}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics section (mirrors /analytics, dummy data) ─────────────────────
function AnalyticsContent() {
  const maxActivity = Math.max(...activityData.map((a) => a.value))
  const metrics = [
    { label: 'Signals Analyzed', value: '1,284', trend: '+12%' },
    { label: 'Reply Rate', value: '84%', trend: '+2.4%' },
    { label: 'Leads Saved', value: '132', trend: '+9' },
    { label: 'Deals Closed', value: '12', trend: '+2' },
  ]

  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 relative scrollbar-hide"
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Analytics
          </h1>
          <p className="text-text-secondary mt-2">
            Lead intelligence and pipeline performance at a glance.
          </p>
        </div>

        <div className="metallic-card overflow-hidden mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-5 sm:p-6 ${i < metrics.length - 1 ? 'border-b border-white/[0.06] lg:border-b-0 lg:border-r lg:border-white/[0.06]' : ''} ${i % 2 === 0 ? 'sm:border-r sm:border-white/[0.06]' : ''}`}
              >
                <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  {stat.label}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tabular-nums tracking-tight text-white">
                    {stat.value}
                  </span>
                  <span className="text-[11px] font-bold text-secondary">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="metallic-card p-5 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                Signal Volume
              </h3>
              <p className="text-sm text-text-secondary">Signals intercepted / day</p>
            </div>
          </div>
          <div className="h-[180px] flex items-end justify-between gap-2 sm:gap-4">
            {activityData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group">
                <div
                  style={{ height: `${(data.value / maxActivity) * 140}px` }}
                  className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-accent-mint/10 to-accent-mint/40 group-hover:to-accent-mint/60 transition-all"
                />
                <span className="text-xxs font-bold text-text-secondary uppercase tracking-widest">
                  {data.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Route → section map ────────────────────────────────────────────────────
const SECTIONS: Record<string, (props: SectionProps) => React.ReactElement> = {
  '/leads': LeadsContent,
  '/saved': SavedContent,
  '/dashboard': DashboardContent,
  '/support': SupportContent,
  '/referrals': ReferralsContent,
  '/rewards': RewardsContent,
  '/community': CommunityContent,
  '/settings': SettingsContent,
  '/analytics': AnalyticsContent,
}

// ─── HERO ───────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const [activeRoute, setActiveRoute] = useState('/leads')
  const heroCardRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile(768)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroCardRef,
    offset: ['start start', 'end start'],
  })

  // Scroll-scrubbed background scale zoom inside clipped island frame
  const bgScale = useTransform(heroProgress, [0, 1], [1.1, 1.35])
  const textOpacity = useTransform(heroProgress, [0, 0.7], [1, 0.3])

  const { scrollY } = useScroll()

  // Direct scroll-linked transforms — no spring wrapper to avoid fighting Lenis
  // Mobile / reduced-motion: static values (no scroll-linked 3D tilt / GPU jank)
  const scrollRotateX = useTransform(scrollY, [0, 600], [22, 0])
  const scrollScale = useTransform(scrollY, [0, 600], [0.95, 1])
  const tiltOff = isMobile || reduceMotion
  const rotateX = tiltOff ? 0 : scrollRotateX
  const scale = tiltOff ? 1 : scrollScale
  const y = 0

  const ActiveSection = SECTIONS[activeRoute] ?? LeadsContent

  return (
    <section
      className="relative min-h-[100dvh] flex flex-col items-center grain-texture overflow-hidden bg-page-bg pt-20 pb-0 px-0"
    >
      {/* Crisp geometric grid background (Engineering precision) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at 50% 20%, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, black 15%, transparent 70%)',
        }}
      />

      {/* ─── 1. Framed Island Card with Custom Wolf Artwork ─── */}
      <div
        ref={heroCardRef}
        className="relative mx-auto w-full min-h-[460px] md:min-h-[500px] rounded-[22px] border border-white/[0.08] overflow-hidden flex items-center justify-center shadow-[0_25px_85px_-20px_rgba(0,0,0,0.85)] mb-10"
      >
        {/* Zooming Background Layer with Custom Wolf Artwork */}
        <motion.div
          style={{ scale: bgScale }}
          className="absolute inset-0 w-full h-full transform-gpu will-change-transform pointer-events-none"
        >
          <Image
            src="/images/hero image 2.png"
            alt="Wolf overlooking glowing client intent signals in the dark valley"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_35%] select-none"
          />

          {/* Calibrated Dark Contrast Scrim for 100% WCAG Typography Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-page-bg/95 via-black/50 to-black/40" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 45%, rgba(11,13,19,0.15) 0%, rgba(11,13,19,0.75) 100%)',
            }}
          />
        </motion.div>

        {/* Centered Content Stack */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 max-w-[800px] mx-auto"
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-semibold leading-[1.05] tracking-tight text-white mb-5 [text-wrap:balance]"
          >
            Stop looking for clients.
            <br />
            <span className="font-light text-white/90">
              Start intercepting them.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="text-sm sm:text-base text-white/80 font-light leading-relaxed max-w-[480px] mx-auto mb-8 [text-wrap:balance]"
          >
            Lead Hunter Club monitors active service demand in real-time, compiles deep social
            intelligence, and unlocks verified contact details so you close deals first.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="flex flex-wrap items-center justify-center gap-3.5"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-3.5 p-1.5 pr-6 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-white/15 hover:border-accent-purple/50 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_rgba(var(--rgb-accent-purple),0.25)] active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-accent-orange flex items-center justify-center text-black shadow-[0_2px_8px_rgba(244,141,22,0.4)] transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRightIcon className="w-4 h-4 text-black stroke-[2.5]" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white tracking-wide">
                Start Hunting Free
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Social Proof Strip ─── */}
      <div className="mb-8 flex flex-col items-center justify-center gap-2 text-center">
        <span className="text-xs font-mono font-medium text-text-secondary/70 uppercase tracking-widest">
          Trusted by 3500+ freelancers, contractors & growth agencies
        </span>
      </div>

      {/* 3D Perspective Container for Clario-style tilt reveal */}
      <div
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        className="relative z-10 w-full mt-[-24px] lg:mt-[-48px] group/appwindow"
      >
        <motion.div
          style={{
            transformStyle: 'preserve-3d',
            rotateX,
            scale,
            y,
          }}
          className={`w-full ${tiltOff ? '' : 'transform-gpu will-change-transform'}`}
        >
          <div className="rounded-t-[24px] overflow-hidden shadow-[0_-25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] border border-white/[0.08] border-b-0 relative">
            {/* Glass reflection sheen overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.05] mix-blend-overlay" />
            {/* Window chrome — macOS traffic lights on desktop, iOS status/safe bar on mobile */}
            <div className="flex items-center bg-code-header border-b border-white/[0.06]">
              {/* Desktop: macOS chrome */}
              <div className="hidden md:flex items-center gap-2 px-5 py-3 w-full">
                <span className="w-3 h-3 rounded-full bg-dot-red" />
                <span className="w-3 h-3 rounded-full bg-dot-yellow" />
                <span className="w-3 h-3 rounded-full bg-dot-green" />
                <span className="ml-4 text-xs font-mono text-text-secondary/30 tracking-wider">
                  lead-hunter.app
                </span>
              </div>
              {/* Mobile: iOS-style compact status bar (time + signal/battery glyphs) */}
              <div className="flex md:hidden items-center justify-between px-5 pt-2 pb-1.5 w-full">
                <span className="text-[11px] font-semibold text-text-primary tabular-nums">9:41</span>
                <span className="flex items-center gap-1 text-text-primary">
                  {/* signal bars */}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" aria-hidden="true">
                    <rect x="0" y="6" width="2.5" height="4" rx="0.5" />
                    <rect x="3.5" y="4" width="2.5" height="6" rx="0.5" />
                    <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
                    <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
                  </svg>
                  {/* wifi */}
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor" aria-hidden="true">
                    <path d="M6 9.5a1 1 0 100-2 1 1 0 000 2zM2.7 6.2a4.7 4.7 0 016.6 0l-1.1 1.1a3.1 3.1 0 00-4.4 0L2.7 6.2zM.6 4.1a7.7 7.7 0 0110.8 0L10.3 5.2a6.1 6.1 0 00-8.6 0L.6 4.1z" />
                  </svg>
                  {/* battery */}
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden="true">
                    <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" opacity="0.4" />
                    <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
                    <path d="M20 3.5v3a1.5 1.5 0 000-3z" fill="currentColor" opacity="0.4" />
                  </svg>
                </span>
              </div>
            </div>

            {/* App body — column on mobile (content + bottom dock), row on desktop (sidebar).
                `relative` clips the MobileBottomNav demo bottom-sheet to the frame. */}
            <div className="relative flex flex-col md:flex-row h-[520px] sm:h-[480px] md:h-[510px] bg-bg-main overflow-hidden">
              {/* REAL AppSidebar in demo mode — identical 7-item nav, orange active states,
                  interactive collapse, credits widget, Settings/Sign Out (demo-safe) */}
              <div className="hidden md:block shrink-0 h-full">
                <AppSidebar
                  isDemo
                  demoCredits={750}
                  demoPlanMax={1000}
                  hiddenPaths={['/refill']}
                  activePathOverride={activeRoute}
                  onNavItemClick={(href) => setActiveRoute(href)}
                />
              </div>

              {/* Main content area */}
              <div className="flex flex-1 overflow-hidden w-full relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeRoute}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3, ease }}
                    className="absolute inset-0 flex"
                  >
                    <ActiveSection onNavigate={(href) => setActiveRoute(href)} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* REAL MobileBottomNav in demo mode — inline dock + working More bottom sheet */}
              <div className="md:hidden">
                <MobileBottomNav
                  isDemo
                  activePathOverride={activeRoute}
                  onNavigate={(href) => setActiveRoute(href)}
                  demoCredits={750}
                  demoPlanMax={1000}
                />
              </div>
            </div>

            {/* Bottom fade-out overlay (desktop only — mobile has the bottom dock) */}
            <div className="hidden md:block absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-30">
              <div className="absolute inset-0 bg-gradient-to-t from-page-bg/80 to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
