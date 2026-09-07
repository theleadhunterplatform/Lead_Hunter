'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
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
} from '@heroicons/react/24/solid'
import Link from 'next/link'
const allLeads: Array<{
  id: string
  name: string
  email: string
  company: string
  source: string
  category: string
  title: string
  signalContext: string
  role: string
  taskScope: string
  mustHave: string
  nicheBonus: string
  buyerType: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  winProb: 'low' | 'medium' | 'high'
  nicheTags: string[]
  hashtags: string[]
  replyProbability: number
  status: 'new' | 'saved' | 'drafting' | 'sent' | 'replied' | 'follow-up'
  timestamp: string
  niches: string[]
  accent?: 'mint' | 'purple'
  isActionable?: boolean
}> = [
  {
    id: '1',
    name: 'Andy Shepard',
    email: 'a.shepard@gmail.com',
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
  },
  {
    id: '2',
    name: 'Emily Thompson',
    email: 'e.thompson@vanguard.io',
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
  },
  {
    id: '3',
    name: 'Michael Carter',
    email: 'm.carter@stellar.co',
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
  },
  {
    id: '4',
    name: 'David Anderson',
    email: 'd.anderson@prism.io',
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
import LeadCard from '@/app/leads/components/LeadCard'
import PipelineLeadCard from '@/app/leads/components/PipelineLeadCard'

const ease = [0.16, 1, 0.3, 1] as const

const tabs = [
  { id: 'leads', label: 'Lead Feed', icon: BanknotesIcon },
  { id: 'saved', label: 'Saved Leads', icon: BookmarkIcon },
  { id: 'pipeline', label: 'Pipeline', icon: ChartBarSquareIcon },
  { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon },
]

// ─── Real Lead Feed content (100% precise to leads/page.tsx) ──────────────
function LeadsContent() {
  // Generate 4 leads for mockup preview
  const feedLeads = Array.from({ length: 4 }, (_, i) => ({
    ...allLeads[i % allLeads.length],
    id: `hero-lead-${i}`,
  }))

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 pb-32 relative w-full scrollbar-hide">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-purple-medium pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header & Command Bar */}
        <div className="flex flex-col items-center justify-center mb-16 mt-4">
          {/* Raycast-style Command Palette */}
          <div className="relative group w-full max-w-2xl mb-12">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-accent-purple/20 via-accent-purple/10 to-accent-purple/20 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-surface border border-white/[0.08] rounded-2xl p-2 shadow-2xl focus-within:ring-1 focus-within:ring-white/20 transition-all">
              <div className="pl-4 pr-3 text-text-secondary">
                <MagnifyingGlassIcon className="w-5 h-5 text-text-secondary" />
              </div>
              <input
                type="text"
                placeholder="Ask AI or search signals... (Press ⌘K)"
                className="w-full bg-transparent border-none text-text-primary text-[15px] placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 py-3"
              />
              <div className="flex items-center gap-2 pr-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <SparklesIcon className="w-[14px] h-[14px] text-text-secondary" />
                  <span className="text-[11px] font-semibold text-text-secondary">AI Filter</span>
                </div>
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-widest">
                  ⌘K
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex items-end justify-between">
            <div>
              <h1 className="text-[32px] font-bold text-text-primary tracking-tight mb-2 flex items-center gap-3">
                Lead Feed
                <div className="flex items-center gap-2 px-2.5 py-1 border-l-2 border-accent-purple bg-gradient-to-r from-accent-purple/10 to-transparent text-text-secondary hover:text-text-primary transition-colors text-[11px] font-bold tracking-super uppercase">
                  <span className="w-1.5 h-1.5 bg-accent-purple animate-pulse" />4 Signals
                </div>
              </h1>
              <p className="text-text-secondary/80 text-sm">
                Real-time conversational opportunities intercepted across your network.
              </p>
            </div>
          </div>
        </div>

        {/* Asymmetrical CSS Grid Feed exactly like leads/page.tsx */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 auto-rows-fr">
          {feedLeads.map((lead) => (
            <PipelineLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Real Saved Leads content (100% precise to saved/page.tsx) ────────────────────
function SavedContent() {
  const [activeTab, setActiveTab] = useState('All Leads')
  const savedLeads = getSavedLeads()

  const summaryCards = [
    {
      label: 'Reply Received',
      sub: 'Awaiting negotiation',
      count: '4 Leads',
      accent: 'purple',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      label: 'Urgent Follow-up',
      sub: 'SLA window closing',
      count: '2 Urgent',
      accent: 'purple',
      icon: ExclamationTriangleIcon,
    },
    {
      label: 'High Budget',
      sub: 'Whale tier opportunities',
      count: '$10k+ Potential',
      accent: 'purple',
      icon: ViewfinderCircleIcon,
    },
    {
      label: 'High Intent',
      sub: 'AI-verified opportunities',
      count: '8 New',
      accent: 'purple',
      icon: SparklesIcon,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 relative scrollbar-hide border-accent-purple text-accent-purple bg-gradient-to-r from-accent-purple/10">
      <div className="max-w-[1400px] mx-auto relative z-10 border-accent-purple text-accent-purple bg-gradient-to-r from-accent-purple/10">
        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative p-6 rounded-3xl bg-surface-secondary/50 border border-white/[0.05] hover:bg-surface-secondary hover:border-white/10 transition-all duration-300 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`p-3 rounded-2xl bg-accent-${card.accent}/10 text-accent-${card.accent} shadow-inner`}
                >
                  <card.icon className="w-[22px] h-[22px]" />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest text-accent-${card.accent}`}
                >
                  {card.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">{card.label}</h3>
              <p className="text-xs text-text-secondary mt-1">{card.sub}</p>
              <div
                className={`absolute bottom-0 left-0 w-full h-1 bg-accent-${card.accent}/20 group-hover:bg-accent-${card.accent}/40 transition-all`}
              />
            </motion.div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
              <BookmarkIcon className="w-6 h-6 text-text-secondary" />
              Saved Leads
            </h2>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {['All Leads', 'In Progress', 'Archived'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? 'bg-accent-orange text-text-on-accent shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search pipeline..."
                className="bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-border-subtle transition-all w-48 lg:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-accent-orange text-text-on-accent rounded-xl font-bold text-xs hover: transition-all">
              <SparklesIcon className="w-[14px] h-[14px]" />
              Report
            </button>
          </div>
        </div>

        {/* High-Density Pipeline Table */}
        <div className="bg-code-header border border-white/[0.05] rounded-4xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/[0.05] text-[10px] font-bold text-text-secondary uppercase tracking-super min-w-[800px]">
            <div className="col-span-1">Status</div>
            <div className="col-span-4">Lead</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Process</div>
            <div className="col-span-2 text-right">Last Action</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-white/[0.03] min-w-[800px] overflow-x-auto">
            {savedLeads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="grid grid-cols-12 gap-4 px-8 py-5 items-center group hover:bg-white/[0.02] transition-colors focus:border-accent-purple/50"
              >
                <div className="col-span-1 flex items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-accent-${lead.accent || 'purple'} ${lead.isActionable ? 'animate-pulse ring-4 ring-accent-purple/20' : 'opacity-40'}`}
                  />
                </div>

                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-[11px] font-bold text-text-primary overflow-hidden shrink-0">
                    {lead.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-text-primary group-hover:text-text-secondary hover:text-text-primary transition-colors transition-colors truncate group-hover:text-accent-orange">
                      {lead.name}
                    </div>
                    <div className="text-[10px] group-hover:text-accent-orange truncate">
                      {lead.email}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-text-primary transition-colors">
                    {lead.source}
                  </span>
                </div>

                <div className="col-span-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest text-accent-${lead.accent}`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-[10px] text-text-secondary font-mono">
                    SIGNAL_ANALYSIS_V2.4
                  </span>
                </div>

                <div className="col-span-1 text-right">
                  {lead.isActionable ? (
                    <button className="px-3 py-1.5 bg-text-primary text-bg-main rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-accent-purple transition-colors">
                      Engage
                    </button>
                  ) : (
                    <button className="p-2 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-accent-purple">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Real Dashboard content (100% precise to dashboard/page.tsx) ─────────
function DashboardContent() {
  const staticStats = [
    {
      label: 'Signals Intercepted',
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
    {
      label: 'Credits Remaining',
      value: '750',
      trend: '/ 1,000',
      accent: 'purple' as const,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-10 py-12 relative scrollbar-hide">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-purple-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors uppercase tracking-ultra mb-3">
              <CheckCircleIcon className="w-[14px] h-[14px]" /> Operational Status: Active
            </div>
            <h1 className="text-4xl font-bold text-text-primary tracking-tight">
              Operational Overview
            </h1>
            <p className="text-text-secondary mt-2">
              Welcome back. Your conversion pipeline is performing at 84% efficiency.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-surface-secondary border border-subtle flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                Live Node: US-EAST
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {staticStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group metallic-card p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-xl bg-accent-${stat.accent}/10 text-accent-${stat.accent}`}
                >
                  {stat.label === 'Signals Intercepted' && (
                    <ViewfinderCircleIcon className="w-5 h-5" />
                  )}
                  {stat.label === 'Active Conversations' && (
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  )}
                  {stat.label === 'Avg. Reply Probability' && <BoltIcon className="w-5 h-5" />}
                  {stat.label === 'Credits Remaining' && <BanknotesIcon className="w-5 h-5" />}
                </div>
                {stat.trend && (
                  <span
                    className={`text-[11px] font-bold ${stat.trendUp ? 'text-accent-purple' : 'text-text-secondary'} flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md`}
                  >
                    {stat.trend}
                    {stat.trendUp && <ArrowTopRightOnSquareIcon className="w-3 h-3" />}
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-text-primary mb-1">{stat.value}</h3>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {stat.label}
              </p>
              <div
                className={`absolute bottom-0 left-0 w-full h-[2px] bg-accent-${stat.accent}/20 group-hover:bg-accent-${stat.accent}/40 transition-all`}
              />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Chart Section */}
          <div className="lg:col-span-2 metallic-card p-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Conversion Velocity
                </h3>
                <p className="text-sm text-text-secondary">Reply momentum over the last 7 days</p>
              </div>
              <select className="bg-surface-elevated border border-subtle text-xs text-text-primary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-purple/50">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>

            <div className="h-[200px] flex items-end justify-between gap-4">
              {activityData.map((data, i) => (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${data.value * 2}px` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: 'circOut' }}
                    className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-accent-purple/10 to-accent-purple/40 group-hover:to-accent-purple/60 transition-all relative"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors bg-surface-elevated px-2 py-1 rounded border border-border-subtle">
                      {data.value}%
                    </div>
                  </motion.div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    {data.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & AI Status */}
          <div className="space-y-6">
            <div className="p-8 rounded-4xl bg-accent-orange text-text-on-accent relative overflow-hidden group">
              <h3 className="text-xl font-bold mb-2">Revealed Leads</h3>
              <p className="text-sm opacity-80 mb-8 leading-relaxed">
                You have 12 high-intent leads revealed and ready to work.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-text-on-accent text-accent-purple font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl"
              >
                Review New Leads <ArrowTopRightOnSquareIcon className="w-[18px] h-[18px]" />
              </motion.button>
            </div>

            <div className="metallic-card p-8">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-6">
                Lead Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'SaaS', trend: 'High Demand', color: 'purple' },
                  { label: 'Fintech', trend: 'Growing', color: 'purple' },
                  { label: 'E-commerce', trend: 'Saturating', color: 'purple' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest text-accent-${item.color}`}
                    >
                      {item.trend}
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

// ─── Real Pipeline content (tracking flow: Saved → Contacted → Replied → Closed) ──
const pipelineStages = [
  { id: 'saved', label: 'Saved', desc: 'Unlocked & in your pipeline', icon: BookmarkIcon },
  {
    id: 'contacted',
    label: 'Contacted',
    desc: 'You reached out',
    icon: ArrowTopRightOnSquareIcon,
  },
  {
    id: 'replied',
    label: 'Replied',
    desc: 'Conversation started',
    icon: ChatBubbleLeftRightIcon,
  },
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
    <div className="flex-1 overflow-y-auto px-10 py-12 relative scrollbar-hide">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-purple-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-ultra mb-3">
            <AdjustmentsHorizontalIcon className="w-[14px] h-[14px]" /> Live Pipeline
          </div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Pipeline</h1>
          <p className="text-text-secondary mt-2">
            Track every interaction from reveal to close — mark when you reach out, when they
            reply.
          </p>
        </div>

        {/* Stage Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pipelineStages.map((stage, i) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group metallic-card p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-accent-purple/10 text-accent-purple">
                  <stage.icon className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-text-primary">
                  {stageCounts[stage.id]}
                </span>
              </div>
              <h3 className="text-sm font-bold text-text-primary tracking-tight">{stage.label}</h3>
              <p className="text-xs text-text-secondary mt-1">{stage.desc}</p>
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent-purple/20 group-hover:bg-accent-purple/40 transition-all" />
            </motion.div>
          ))}
        </div>

        {/* Pipeline Rows */}
        <div className="bg-code-header border border-white/[0.05] rounded-4xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/[0.05] text-[10px] font-bold text-text-secondary uppercase tracking-super min-w-[800px]">
            <div className="col-span-5">Lead</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-4">Stage</div>
            <div className="col-span-1 text-right">Score</div>
          </div>

          <div className="divide-y divide-white/[0.03] min-w-[800px] overflow-x-auto">
            {savedLeads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="grid grid-cols-12 gap-4 px-8 py-5 items-center group hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-[11px] font-bold text-text-primary overflow-hidden shrink-0">
                    {lead.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-text-primary truncate group-hover:text-accent-orange">
                      {lead.name}
                    </div>
                    <div className="text-[10px] text-text-secondary truncate">{lead.email}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-text-secondary">
                    {lead.source}
                  </span>
                </div>

                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      {pipelineStages.map((s, si) => {
                        const filled = si <= stageIndex(lead.stage)
                        return (
                          <div
                            key={s.id}
                            className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: filled ? '100%' : '0%' }}
                              transition={{ duration: 0.6, delay: 0.2 + si * 0.05 }}
                              className="h-full bg-accent-purple/60 rounded-full"
                            />
                          </div>
                        )
                      })}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-accent-purple shrink-0">
                      {lead.stage}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-bold text-text-secondary">
                    {lead.replyProbability}%
                  </span>
                </div>
              </motion.div>
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

  const { scrollY } = useScroll()

  // Direct scroll-linked transforms — no spring wrapper to avoid fighting Lenis
  const rotateX = useTransform(scrollY, [0, 600], [22, 0])
  const scale = useTransform(scrollY, [0, 600], [0.95, 1])
  const y = useTransform(scrollY, [0, 600], [0, 0])

  return (
    <section
      className="relative min-h-screen flex flex-col items-center grain-texture overflow-hidden bg-page-bg pt-20 pb-0 px-6"
    >
      {/* Subtle geometric grid background (Centered under the text, faint mint lines) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(var(--rgb-accent-purple), 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--rgb-accent-purple), 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at 50% 30%, black 10%, transparent 60%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 30%, black 10%, transparent 60%)',
        }}
      />

      {/* Faint precise technical backlight glow */}
      <div
        className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full pointer-events-none z-0 mix-blend-screen opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(var(--rgb-accent-purple),0.03) 0%, rgba(var(--rgb-tab-purple),0.02) 50%, transparent 70%)',
        }}
      />

      {/* Centered Clario-style hero layout */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col justify-center items-center text-center pt-20 pb-4 transform-gpu">
        <div className="flex flex-col items-center relative w-full">
          {/* Centered Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.07, ease }}
            className="font-sans text-[38px] md:text-[54px] lg:text-[68px] font-semibold leading-[1.05] tracking-tighter mb-6 text-text-primary max-w-4xl mx-auto antialiased"
          >
            Stop looking for clients
            <br />
            <span className="text-accent-orange">Start intercepting them.</span>
          </motion.h1>

          {/* Centered Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="text-[15px] md:text-[17px] text-text-secondary font-light leading-relaxed mb-10 max-w-2xl mx-auto antialiased"
          >
            Lead Hunter Club monitors active service demand in real-time, compiles deep social
            intelligence, and unlocks verified contact details — so you can close deals while the
            demand is hot.
          </motion.p>

          {/* Centered CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="flex flex-row items-center justify-center gap-4 w-full relative z-10"
          >
            <Link href="/register">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-bold text-sm cursor-pointer shadow-[0_4px_25px_rgba(var(--rgb-primary-container),0.3)] transition-all hover:bg-primary-container/90"
              >
                Start Hunting <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/sneak-peek">
              <motion.span
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white/[0.02] shadow-[inset_0_1px_0_rgba(var(--rgb-white),0.06)] font-medium text-text-secondary hover:text-text-primary text-sm transition-colors cursor-pointer border border-white/[0.06] hover:border-border-subtle hover:bg-accent-purple/[0.03] hover:border-accent-purple/20"
              >
                Sneak Peek
              </motion.span>
            </Link>
          </motion.div>

          {/* Concentrated amber backlight aura directly behind the button */}
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[400px] h-[150px] glow-primary-strong pointer-events-none z-0" />

          {/* Larger ambient backlight glow under button and behind mockup top edge */}
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[700px] h-[300px] glow-primary-strong pointer-events-none z-0" />
        </div>
      </div>

      {/* 3D Perspective Container for Clario-style tilt reveal */}
      <div
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        className="relative z-10 w-full max-w-[1200px] mt-[-24px] lg:mt-[-48px] group/appwindow"
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
          {/* Faint separation backlight Behind the App Window */}
          <div
            className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-[100%] pointer-events-none -z-10 mix-blend-screen"
            style={{
              background:
                'radial-gradient(circle, rgba(var(--rgb-accent-purple),0.06) 0%, transparent 70%)',
            }}
          />

          {/* Faint Stage shadow glow */}
          <div
            className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-2/3 h-24 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse, rgba(var(--rgb-accent-purple),0.07) 0%, transparent 75%)',
              filter: 'blur(20px)',
            }}
          />

          <div className="rim-light rounded-t-[24px] overflow-hidden shadow-[0_-60px_120px_-20px_rgba(var(--rgb-black),0.9)] border border-white/[0.04] border-t-accent-purple/20 border-b-0 relative">
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
            <div className="flex h-[760px] bg-bg-main overflow-hidden">
              {/* Sidebar — matches AppSidebar visually, uses state instead of router */}
              <div className="w-[240px] shrink-0 bg-code-header border-r border-white/[0.04] flex flex-col py-4">
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

            {/* Bottom fade-out overlay (opaque gradient — no backdrop-blur to avoid GPU thrash during scroll) */}
            <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-30">
              <div className="absolute inset-0 bg-gradient-to-t from-page-bg via-page-bg/90 via-60% to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
