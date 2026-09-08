'use client'

import Image from 'next/image'
import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  BanknotesIcon,
  BookmarkIcon,
  Squares2X2Icon,
  SparklesIcon,
  ArrowRightIcon,
  ViewfinderCircleIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChartBarSquareIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EllipsisHorizontalIcon,
  InformationCircleIcon,
  EyeIcon,
  ClockIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { AppLead } from '@/types/lead'
import LeadCard from '@/app/leads/components/LeadCard'
import PipelineLeadCard from '@/app/leads/components/PipelineLeadCard'

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
const getSavedLeads = () =>
  allLeads.filter((l) => ['saved', 'drafting', 'sent', 'replied', 'follow-up'].includes(l.status))
const dashboardStats = [
  {
    label: 'Analyzed Leads',
    value: '1,284',
    trend: '+12%',
    trendUp: true,
    accent: 'purple' as const,
  },
  {
    label: 'Active Conversations',
    value: '42',
    trend: '+5',
    trendUp: true,
    accent: 'purple' as const,
  },
  {
    label: 'Avg. Reply Probability',
    value: '84%',
    trend: '+2.4%',
    trendUp: true,
    accent: 'purple' as const,
  },
  { label: 'Credits Remaining', value: '750', trend: '/ 1,000', accent: 'purple' as const },
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
const ease = [0.16, 1, 0.3, 1] as const

const tabs = [
  { id: 'leads', label: 'Lead Feed', icon: BanknotesIcon },
  { id: 'saved', label: 'Saved Leads', icon: BookmarkIcon },
  { id: 'pipeline', label: 'Pipeline', icon: ChartBarSquareIcon },
  { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon },
]

const primaryHeroNiches = [
  'All',
  'Web Dev',
  'Design',
  'Marketing',
  'SEO',
  'Sales & RevOps',
]

// ─── Real Lead Feed content (compact hero preview) ──────────────
function LeadsContent() {
  const [activeNiche, setActiveNiche] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid')
  const [sortBy, setSortBy] = useState<'newest' | 'replyProbability' | 'urgency'>('newest')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const filteredLeads = useMemo(() => {
    let result = [...allLeads]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.title.toLowerCase().includes(q) ||
          lead.name.toLowerCase().includes(q) ||
          lead.company.toLowerCase().includes(q) ||
          lead.category.toLowerCase().includes(q) ||
          lead.taskScope?.toLowerCase().includes(q) ||
          lead.nicheTags?.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (activeNiche !== 'All') {
      result = result.filter(
        (lead) =>
          lead.niches?.some((n) => n.toLowerCase().includes(activeNiche.toLowerCase())) ||
          lead.category.toLowerCase().includes(activeNiche.toLowerCase()) ||
          lead.nicheTags?.some((t) => t.toLowerCase().includes(activeNiche.toLowerCase())),
      )
    }

    // Sort
    if (sortBy === 'replyProbability') {
      result.sort((a, b) => (b.replyProbability || 0) - (a.replyProbability || 0))
    } else if (sortBy === 'urgency') {
      const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      result.sort(
        (a, b) => (urgencyRank[b.urgency || 'low'] || 0) - (urgencyRank[a.urgency || 'low'] || 0),
      )
    }

    return result
  }, [searchQuery, activeNiche, sortBy])

  const displayLeads = filteredLeads.length > 0 ? filteredLeads.slice(0, 6) : allLeads.slice(0, 6)

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-16 relative w-full scrollbar-hide">
      <div className="w-full max-w-[1240px] mx-auto relative z-10">
        {/* Real Lead Feed Header & Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 shrink-0">
            <h3 className="text-base font-bold text-text-primary tracking-tight">Lead Feed</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[10px] font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
              <span>{filteredLeads.length} Live Signals</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Real Search Input with ⌘K */}
            <div className="relative group flex-1 sm:w-52">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-accent-purple/20 via-accent-mint/20 to-accent-purple/20 rounded-xl blur-sm opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center bg-code-bg/90 border border-white/[0.08] rounded-xl px-2.5 py-1 shadow-sm focus-within:ring-1 focus-within:ring-white/20">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-text-secondary mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search signals... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-text-primary text-[11px] placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 py-0.5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-1 text-[10px] font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-text-secondary shrink-0">
                  ⌘K
                </span>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#1b1c1d] border border-white/[0.08] rounded-xl p-0.5 shadow-sm shrink-0">
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                  />
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v13.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              </button>
            </div>

            {/* Sort Pill */}
            <div
              onClick={() =>
                setSortBy((prev) =>
                  prev === 'newest'
                    ? 'replyProbability'
                    : prev === 'replyProbability'
                      ? 'urgency'
                      : 'newest',
                )
              }
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-code-bg/80 border border-white/[0.08] text-[11px] text-text-secondary cursor-pointer hover:border-white/15 transition-colors select-none"
              title="Click to cycle sort order"
            >
              <span>
                {sortBy === 'newest'
                  ? 'Newest'
                  : sortBy === 'replyProbability'
                    ? 'High Reply'
                    : 'Urgent'}
              </span>
              <ChevronDownIcon className="w-3 h-3 text-text-secondary" />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl bg-code-bg/80 border text-[11px] font-medium transition-all ${
                isFilterOpen
                  ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                  : 'border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-white/15'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Niche Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3.5 scrollbar-hide">
          {primaryHeroNiches.map((niche) => {
            const isActive = activeNiche === niche
            return (
              <button
                key={niche}
                onClick={() => setActiveNiche(niche)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-accent-purple/10 border-accent-purple text-accent-purple shadow-[0_0_12px_rgba(168,85,247,0.18)]'
                    : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                }`}
              >
                {niche}
              </button>
            )
          })}
        </div>

        {/* 3-column Grid of real LeadCards matching leadfeed design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch w-full mx-auto">
          {displayLeads.map((lead, i) => (
            <div key={lead.id} className="w-full flex justify-center">
              <div className="w-full max-w-[360px]">
                {viewMode === 'pipeline' ? (
                  <PipelineLeadCard lead={lead} index={i} />
                ) : (
                  <LeadCard lead={lead} index={i} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Real Saved Leads content (compact hero preview) ────────────────────
function SavedContent() {
  const [activeTab, setActiveTab] = useState('All Leads')
  const savedLeads = getSavedLeads()

  const summaryCards = [
    { label: 'Reply Received', count: '4 Leads', accent: 'purple', icon: ChatBubbleLeftRightIcon },
    { label: 'Urgent Follow-up', count: '2 Urgent', accent: 'orange', icon: ExclamationTriangleIcon },
    { label: 'High Budget', count: '$10k+', accent: 'mint', icon: ViewfinderCircleIcon },
    { label: 'High Intent', count: '8 New', accent: 'purple', icon: SparklesIcon },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-16 relative scrollbar-hide">
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Summary Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="p-2.5 rounded-xl bg-surface-secondary/40 border border-white/[0.05] flex items-center gap-2.5"
            >
              <div className="p-1.5 rounded-lg bg-white/5 text-text-secondary shrink-0">
                <card.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] text-text-secondary/70 truncate">{card.label}</div>
                <div className="text-xs font-bold text-text-primary">{card.count}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Saved Leads</h3>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
              {['All', 'In Progress'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-accent-orange text-text-on-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Table */}
        <div className="bg-code-header border border-white/[0.05] rounded-xl overflow-hidden text-xs">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-white/[0.05] text-[9px] font-mono text-text-secondary/60 uppercase">
            <div className="col-span-5">Lead</div>
            <div className="col-span-3">Source</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Intent</div>
          </div>

          <div className="divide-y divide-white/[0.03]">
            {savedLeads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-white/[0.02]"
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-[9px] font-bold text-text-primary shrink-0">
                    {lead.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{lead.name}</div>
                    <div className="text-[10px] text-text-secondary/60 truncate">{lead.company}</div>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-text-secondary">
                    {lead.source}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] font-mono uppercase text-accent-purple font-medium">
                    {lead.status}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[10px] font-mono font-semibold text-accent-mint">
                    {lead.replyProbability}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Real Dashboard content (compact hero preview) ─────────
function DashboardContent() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-16 relative scrollbar-hide">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">Performance</h3>
          <span className="text-[9px] font-mono text-text-secondary/60 uppercase">Past 7 days</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {dashboardStats.map((stat) => (
            <div
              key={stat.label}
              className="p-2.5 rounded-xl bg-surface-secondary/40 border border-white/[0.05]"
            >
              <div className="text-[9px] text-text-secondary/70 truncate mb-1">{stat.label}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-text-primary">{stat.value}</span>
                <span className="text-[9px] font-mono text-accent-mint">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-code-header border border-white/[0.05]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-text-primary">Conversion Velocity</span>
            <span className="text-[10px] font-mono text-text-secondary/60">Signals intercepted / day</span>
          </div>
          <div className="h-[90px] flex items-end justify-between gap-3 px-2">
            {activityData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  style={{ height: `${data.value * 0.9}px` }}
                  className="w-full max-w-[28px] rounded-t bg-accent-purple/40 hover:bg-accent-purple/70 transition-all"
                />
                <span className="text-[9px] font-mono text-text-secondary/60">{data.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Real Pipeline content (compact hero preview) ──
const pipelineStages = [
  { id: 'saved', label: 'Saved', desc: 'Unlocked & in pipeline', icon: BookmarkIcon },
  { id: 'contacted', label: 'Contacted', desc: 'You reached out', icon: ArrowTopRightOnSquareIcon },
  { id: 'replied', label: 'Replied', desc: 'Conversation started', icon: ChatBubbleLeftRightIcon },
  { id: 'closed', label: 'Closed', desc: 'Deal won', icon: CheckCircleIcon },
]

function pipelineStageFor(status: string) {
  if (status === 'replied') return 'replied'
  if (status === 'sent' || status === 'follow-up') return 'contacted'
  return 'saved'
}

function PipelineContent() {
  const savedLeads = getSavedLeads().map((lead) => ({
    ...lead,
    stage: pipelineStageFor(lead.status),
  }))

  const stageCounts = pipelineStages.reduce(
    (acc, stage) => ({
      ...acc,
      [stage.id]: savedLeads.filter((l) => l.stage === stage.id).length,
    }),
    {} as Record<string, number>,
  )

  const stageIndex = (stage: string) => pipelineStages.findIndex((s) => s.id === stage)

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-16 relative scrollbar-hide">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Pipeline</h3>
            <span className="text-[9px] font-mono text-text-secondary/60 uppercase">
              {savedLeads.length} active leads
            </span>
          </div>
        </div>

        {/* Stage Flow Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {pipelineStages.map((stage) => (
            <div
              key={stage.id}
              className="p-2.5 rounded-xl bg-surface-secondary/40 border border-white/[0.05]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-secondary font-medium">{stage.label}</span>
                <span className="text-xs font-bold text-text-primary">{stageCounts[stage.id]}</span>
              </div>
              <p className="text-[9px] text-text-secondary/50 truncate">{stage.desc}</p>
            </div>
          ))}
        </div>

        {/* Pipeline Rows */}
        <div className="bg-code-header border border-white/[0.05] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-white/[0.05] text-[9px] font-mono text-text-secondary/60 uppercase">
            <div className="col-span-5">Lead</div>
            <div className="col-span-3">Source</div>
            <div className="col-span-3">Stage</div>
            <div className="col-span-1 text-right">Win</div>
          </div>

          <div className="divide-y divide-white/[0.03]">
            {savedLeads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-white/[0.02]"
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-[9px] font-bold text-text-primary shrink-0">
                    {lead.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{lead.name}</div>
                    <div className="text-[10px] text-text-secondary/60 truncate">{lead.company}</div>
                  </div>
                </div>

                <div className="col-span-3">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-text-secondary">
                    {lead.source}
                  </span>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 flex-1">
                      {pipelineStages.map((s, si) => (
                        <div
                          key={s.id}
                          className={`h-1 flex-1 rounded-full ${
                            si <= stageIndex(lead.stage) ? 'bg-accent-purple/80' : 'bg-white/[0.08]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-accent-purple shrink-0 uppercase">
                      {lead.stage}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-right">
                  <span className="text-[10px] font-mono font-semibold text-accent-mint">
                    {lead.replyProbability}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const [activeTab, setActiveTab] = useState('leads')
  const heroCardRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroCardRef,
    offset: ['start start', 'end start'],
  })

  // Scroll-scrubbed background scale zoom inside clipped island frame
  const bgScale = useTransform(heroProgress, [0, 1], [1.1, 1.35])
  const textOpacity = useTransform(heroProgress, [0, 0.7], [1, 0.3])

  const { scrollY } = useScroll()

  // Direct scroll-linked transforms — no spring wrapper to avoid fighting Lenis
  const rotateX = useTransform(scrollY, [0, 600], [22, 0])
  const scale = useTransform(scrollY, [0, 600], [0.95, 1])
  const y = useTransform(scrollY, [0, 600], [0, 0])

  return (
    <section
      className="relative min-h-screen flex flex-col items-center grain-texture overflow-hidden bg-page-bg pt-20 pb-0 px-0"
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
            <span className="italic font-normal font-serif text-white/90">
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
          Trusted by 500+ freelancers, contractors & growth agencies
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
          className="w-full transform-gpu will-change-transform"
        >
          <div className="rounded-t-[24px] overflow-hidden shadow-[0_-25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] border border-white/[0.08] border-b-0 relative">
            {/* Glass reflection sheen overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.05] mix-blend-overlay" />
            {/* macOS chrome */}
            <div className="flex items-center gap-2 px-5 py-3 bg-code-header border-b border-white/[0.06]">
              <span className="w-3 h-3 rounded-full bg-dot-red" />
              <span className="w-3 h-3 rounded-full bg-dot-yellow" />
              <span className="w-3 h-3 rounded-full bg-dot-green" />
              <span className="ml-4 text-xs font-mono text-text-secondary/30 tracking-wider">
                lead-hunter.app
              </span>
            </div>

            {/* App body */}
            <div className="flex h-[480px] md:h-[510px] bg-bg-main overflow-hidden">
              {/* Sidebar — matches AppSidebar visually, uses state instead of router */}
              <div className="w-[210px] lg:w-[215px] shrink-0 bg-code-header border-r border-white/[0.04] flex flex-col py-4">
                <div className="px-5 mb-6 flex items-center gap-3">
                  <Image
                    src="/logo.svg"
                    alt="Lead Hunter Club"
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-lg"
                  />
                  <span className="font-semibold text-sm text-text-primary tracking-tight">
                    Lead Hunter Club
                  </span>
                </div>

                <div className="flex-1 px-3 space-y-1">
                  {tabs.map((t) => {
                    const isActive = activeTab === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative ${isActive ? 'text-accent-purple' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'}`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="hero-sidebar-active"
                            className="absolute inset-0 bg-accent-purple/10 border border-accent-purple/20 rounded-xl shadow-[inset_0_0_12px_rgba(var(--rgb-accent-purple),0.1)]"
                          />
                        )}
                        <t.icon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">{t.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Token widget */}
                <div className="px-4 mt-4 mb-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-primary uppercase tracking-widest">
                        <BanknotesIcon className="w-[11px] h-[11px] text-text-secondary" /> Credits
                      </div>
                      <span className="text-[10px] text-text-secondary">750/1k</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ duration: 1 }}
                        className="h-full bg-accent-purple rounded-full shadow-[0_0_8px_rgba(var(--rgb-accent-purple),0.4)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex flex-1 overflow-hidden w-full relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3, ease }}
                    className="absolute inset-0 flex"
                  >
                    {activeTab === 'leads' && <LeadsContent />}
                    {activeTab === 'saved' && <SavedContent />}
                    {activeTab === 'pipeline' && <PipelineContent />}
                    {activeTab === 'dashboard' && <DashboardContent />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom fade-out overlay (subtle edge blend) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-30">
              <div className="absolute inset-0 bg-gradient-to-t from-page-bg/80 to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
