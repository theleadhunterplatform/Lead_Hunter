'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
  ChartBarSquareIcon,
  ChartBarIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  BookmarkIcon,
  Bars3Icon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid'

import AppSidebar from '@/components/layout/AppSidebar'
import LeadCard from '@/app/leads/components/LeadCard'
import PipelineLeadCard from '@/app/leads/components/PipelineLeadCard'
import { AppLead } from '@/types/lead'

interface PersonaData {
  id: string
  title: string
  copyTitle: string
  description: string
  icon: React.ComponentType<any>
  accentColor: string
  accentBg: string
  accentBorder: string
  lead: {
    name: string
    email: string
    company: string
    source: string
    category: string
    title: string
    taskScope: string
    signalContext: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    nicheTags: string[]
    replyProbability: number
    accent: 'purple' | 'cyan' | 'orange' | 'pink' | 'mint'
  }
}

// Pre-defined static mock leads to populate the spacious background Leads Feed
const mockLead1: AppLead = {
  id: 'mock-1',
  name: 'Lily Hernandez',
  email: 'l.hernandez@nexus.com',
  company: 'Nexus Analytics',
  source: 'Twitter',
  category: 'SEO STRATEGY',
  title: 'SEO Strategy & Keyword Recovery',
  taskScope:
    'Competitor just outranked them for main keywords. Need a senior SEO strategist to recover organic rankings and rebuild backlink velocity.',
  signalContext: 'Competitor just outranked them for their main keyword. Founder is stressed.',
  role: 'SEO Strategist',
  mustHave: 'Technical SEO expertise',
  nicheBonus: 'B2B SaaS experience',
  buyerType: 'B2B SaaS',
  winProb: 'high',
  hashtags: ['#seo', '#b2b'],
  niches: ['Marketing'],
  urgency: 'critical',
  nicheTags: ['B2B SaaS', 'SEO', 'Content'],
  replyProbability: 95,
  accent: 'cyan',
  status: 'new',
  timestamp: '4h ago',
  isClaimable: true,
  revealCost: 3,
  isRevealed: false,
}

const mockLead2: AppLead = {
  id: 'mock-2',
  name: 'David Anderson',
  email: 'd.anderson@prism.io',
  company: 'Prism Labs',
  source: 'Job Board',
  category: 'OUTBOUND SYSTEMS',
  title: 'Sales Enablement & Outbound Systems',
  taskScope:
    'Just hired 3 new SDRs. Need an outbound architecture specialist to setup Clay, Smartlead, and automated lead enrichment.',
  signalContext: 'Just hired 3 new SDRs. Clear indicator they need outbound infrastructure.',
  role: 'Sales Operations Lead',
  mustHave: 'Outbound tooling expertise',
  nicheBonus: 'Clay & Smartlead experience',
  buyerType: 'B2B Startup',
  winProb: 'medium',
  hashtags: ['#sales', '#outbound'],
  niches: ['Sales'],
  urgency: 'medium',
  nicheTags: ['B2B', 'Sales', 'Systems'],
  replyProbability: 75,
  accent: 'orange',
  status: 'new',
  timestamp: '3d ago',
  isClaimable: true,
  revealCost: 3,
  isRevealed: false,
}

const PERSONAS: PersonaData[] = [
  {
    id: 'freelancers',
    title: 'Freelancers',
    copyTitle: 'Freelancers',
    description: 'Spend less time hunting clients and more time doing paid work.',
    icon: UserIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'Andy Shepard',
      email: 'a.shepard@nexus.ai',
      company: 'Nexus AI',
      source: 'Reddit',
      category: 'SHOPIFY DEV',
      title: 'Shopify Speed & Web Optimization',
      taskScope:
        'Struggling with slow load times and high bounce rates on our current Shopify store. Need full audit and speed optimization.',
      signalContext:
        'Struggling with slow load times and high bounce rates on their current Shopify store.',
      urgency: 'high',
      nicheTags: ['E-Commerce', 'Web Dev', 'Shopify'],
      replyProbability: 98,
      accent: 'purple',
    },
  },
  {
    id: 'web-designers',
    title: 'Web Designers',
    copyTitle: 'Web Designers',
    description: 'Find businesses already asking for design help.',
    icon: SparklesIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'Alex Carter',
      email: 'alex@dtcbrands.co',
      company: 'DTC Brands',
      source: 'Twitter',
      category: 'UI/UX DESIGN',
      title: 'Checkout UI/UX Redesign',
      taskScope:
        'Our current checkout page is ugly and mobile conversions are dropping drastically. Looking for complete high-converting Figma overhaul.',
      signalContext: 'Our current checkout page is ugly and conversions are dropping drastically.',
      urgency: 'critical',
      nicheTags: ['E-Commerce', 'UI/UX', 'Conversion'],
      replyProbability: 97,
      accent: 'pink',
    },
  },
  {
    id: 'graphic-designers',
    title: 'Graphic Designers',
    copyTitle: 'Graphic Designers',
    description: 'Find active service demand for brand identities and creative visual assets.',
    icon: BookmarkIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'Sarah Connor',
      email: 's.connor@vanguard.io',
      company: 'Vanguard Group',
      source: 'LinkedIn',
      category: 'BRAND IDENTITY',
      title: 'Brand Identity & Design System',
      taskScope:
        'Looking for a brand designer to completely overhaul our corporate guidelines, visual identity, and investor deck.',
      signalContext:
        'Looking for a brand designer to completely overhaul our corporate guidelines and slide deck.',
      urgency: 'high',
      nicheTags: ['Branding', 'Vector Art', 'Figma'],
      replyProbability: 96,
      accent: 'mint',
    },
  },
  {
    id: 'developers',
    title: 'Developers',
    copyTitle: 'Developers',
    description: 'Reach buyers before competitors do.',
    icon: ChartBarSquareIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'Michael Carter',
      email: 'm.carter@stellar.co',
      company: 'Stellar Co',
      source: 'Reddit',
      category: 'FULLSTACK DEV',
      title: 'Next.js Performance & Core Web Vitals',
      taskScope:
        'Core web vitals dragging down SEO ranking, LCP over 4 seconds. Looking for a senior React/Next.js engineer to refactor rendering pipeline.',
      signalContext: 'Core web vitals dragging down SEO ranking, LCP over 4 seconds.',
      urgency: 'critical',
      nicheTags: ['Next.js', 'Core Web Vitals', 'SEO'],
      replyProbability: 99,
      accent: 'cyan',
    },
  },
  {
    id: 'smma-owners',
    title: 'SMMA Owners',
    copyTitle: 'SMMA Owners',
    description: 'Discover active service demand daily.',
    icon: ChartBarIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'Marcus Gold',
      email: 'm.gold@apparelscale.com',
      company: 'Marcus Apparel',
      source: 'LinkedIn',
      category: 'PAID ADS',
      title: 'Paid Ads Scaling & Creative Testing',
      taskScope:
        'Struggling to maintain ROAS above 1.8x on Meta and TikTok. Looking for creative ad testing framework and media buying partner.',
      signalContext:
        'Struggling to maintain ROAS above 1.8x, looking for creative ad testing framework.',
      urgency: 'high',
      nicheTags: ['DTC Ads', 'Meta', 'TikTok'],
      replyProbability: 95,
      accent: 'orange',
    },
  },
  {
    id: 'agency-owners',
    title: 'Agency Owners',
    copyTitle: 'Agency Owners',
    description: 'Land high-ticket retainer clients with verified buyer-intent leads.',
    icon: CheckCircleIcon,
    accentColor: 'text-text-secondary hover:text-text-primary transition-colors',
    accentBg: 'bg-surface-secondary',
    accentBorder: 'border-border-subtle',
    lead: {
      name: 'David K.',
      email: 'david@gtmpartners.co',
      company: 'GTM Partners',
      source: 'Twitter',
      category: 'DEMAND GEN',
      title: 'B2B Demand Gen & Retainer Pipeline',
      taskScope:
        'Need an agency partner with proven track record in B2B demand gen, outbound pipeline infrastructure, and scalable deal acquisition.',
      signalContext:
        'Need an agency with proven experience in B2B demand gen and scalable pipelines.',
      urgency: 'high',
      nicheTags: ['Demand Gen', 'GTM', 'B2B'],
      replyProbability: 97,
      accent: 'purple',
    },
  },
]

const AUDIENCE_NICHES = [
  { label: 'All', id: 'all', personaId: 'freelancers' },
  { label: 'Shopify Dev', id: 'shopify', personaId: 'freelancers' },
  { label: 'UI/UX Design', id: 'uiux', personaId: 'web-designers' },
  { label: 'Brand Identity', id: 'branding', personaId: 'graphic-designers' },
  { label: 'Fullstack Dev', id: 'dev', personaId: 'developers' },
  { label: 'Paid Ads', id: 'ads', personaId: 'smma-owners' },
  { label: 'Demand Gen', id: 'agency', personaId: 'agency-owners' },
]

export default function WhoItsForGrid() {
  const [activeTab, setActiveTab] = useState<string>('freelancers')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [isHoveredPanel, setIsHoveredPanel] = useState<boolean>(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid')
  const [sortBy, setSortBy] = useState<'newest' | 'replyProbability' | 'urgency'>('newest')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedNicheId, setSelectedNicheId] = useState<string>('all')

  const activePersona = PERSONAS.find((p) => p.id === activeTab) || PERSONAS[0]

  const handleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: true }))
  }

  // Construct a type-compliant AppLead representing the primary interactive card
  const appLead: AppLead = {
    id: activePersona.id,
    name: activePersona.lead.name,
    email: activePersona.lead.email,
    company: activePersona.lead.company,
    source: activePersona.lead.source,
    category: activePersona.lead.category,
    title: activePersona.lead.title,
    taskScope: activePersona.lead.taskScope,
    signalContext: activePersona.lead.signalContext,
    role: activePersona.lead.title,
    mustHave: activePersona.lead.taskScope,
    nicheBonus: activePersona.lead.nicheTags.join(', '),
    buyerType: activePersona.title,
    winProb: 'high',
    hashtags: activePersona.lead.nicheTags.map((t) => `#${t.toLowerCase().replace(/[^a-z0-9]+/g, '')}`),
    niches: [activePersona.lead.category],
    urgency: activePersona.lead.urgency,
    nicheTags: activePersona.lead.nicheTags,
    replyProbability: activePersona.lead.replyProbability,
    accent: activePersona.lead.accent,
    status: revealed[activePersona.id] ? 'saved' : 'new',
    timestamp: '2h ago',
    isClaimable: true,
    revealCost: 3,
    isRevealed: !!revealed[activePersona.id],
  }

  // Typewriting effect inside messaging cockpit draft
  useEffect(() => {
    if (revealed[activePersona.id]) {
      setIsTyping(true)
      setDisplayedText('')

      let index = 0
      const fullText = `Verified contact unlocked: ${activePersona.lead.email} · phone and profile link included. Saved to your pipeline: export anytime as CSV or Excel.`
      const interval = setInterval(() => {
        if (index < fullText.length) {
          setDisplayedText(fullText.substring(0, index + 2))
          index += 2
        } else {
          setIsTyping(false)
          clearInterval(interval)
        }
      }, 12)

      return () => clearInterval(interval)
    } else {
      setDisplayedText('')
      setIsTyping(false)
    }
  }, [revealed, activeTab, activePersona])

  return (
    <section
      id="who"
      className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* HEADER BLOCK: Large text left, horizontal navigation segmented buttons right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-10 relative z-10">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-accent-orange mb-3 block">
              Audience radar
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight text-text-primary leading-[1.15] mb-2.5"
          >
            Built for modern service-based businesses
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-sm md:text-base text-text-secondary font-light max-w-lg leading-relaxed"
          >
            {activePersona.description}
          </motion.p>
        </div>

        {/* Top-Right Interactive horizontal navigation segmented controls */}
        <div className="lg:shrink-0 flex items-center w-full lg:w-auto">
          <div className="w-full flex flex-wrap gap-2 md:gap-2.5 items-center justify-center lg:justify-end bg-surface p-1.5 md:p-2 border border-white/[0.08] rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(var(--rgb-black),0.5)]">
            {PERSONAS.map((p) => {
              const isActive = p.id === activeTab
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveTab(p.id)
                    const match = AUDIENCE_NICHES.find(
                      (n) => n.personaId === p.id && n.id !== 'all',
                    )
                    if (match) setSelectedNicheId(match.id)
                    else setSelectedNicheId('all')
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 md:px-4 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 relative focus:outline-none cursor-pointer flex-1 sm:flex-initial min-w-[85px] md:min-w-[105px] max-w-[120px] ${
                    isActive
                      ? 'text-text-secondary hover:text-text-primary transition-colors'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {/* Active tab glow bg overlay using framer-motion */}
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-glow"
                      className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] shadow-[0_6px_24px_rgba(var(--rgb-black),0.4)] rounded-xl md:rounded-2xl pointer-events-none"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 transition-colors" />
                  <span className="text-[10px] md:text-[11px] font-semibold tracking-wide text-center leading-tight mt-0.5 max-w-[85px] break-words">
                    {p.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* SPACIOUS OVERLAPPED FULL WIDTH SIMULATOR CONTAINER */}
      <div className="w-full relative z-10">
        <div
          onMouseEnter={() => setIsHoveredPanel(true)}
          onMouseLeave={() => setIsHoveredPanel(false)}
          className="w-full rounded-3xl bg-surface border border-white/[0.08] flex flex-col relative overflow-hidden transition-all duration-500 hover:border-white/15 hover:shadow-[0_45px_100px_rgba(var(--rgb-black),0.85)] shadow-[0_30px_70px_rgba(var(--rgb-black),0.6)] h-[530px] md:h-[550px] justify-between"
        >
          {/* Window header */}
          <div className="h-11 border-b border-white/[0.04] bg-surface flex items-center px-6 justify-between shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${isHoveredPanel ? 'bg-dot-red' : 'bg-white/10'}`}
              />
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${isHoveredPanel ? 'bg-dot-yellow' : 'bg-white/10'}`}
              />
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${isHoveredPanel ? 'bg-dot-green' : 'bg-white/10'}`}
              />
            </div>
            <span className="text-[10px] font-mono tracking-widest text-text-secondary/40 font-bold uppercase">
              Interactive App Inside Preview
            </span>
            <div className="w-12" />
          </div>

          {/* Simulated App Viewport */}
          <div className="flex flex-1 flex-row h-full overflow-hidden bg-bg-main relative">
            {/* Real App Sidebar (rendered in compact demo mode) */}
            <div
              className={`hidden ${isSidebarOpen ? 'md:block' : ''} shrink-0 h-full border-r border-white/[0.06] transition-all duration-300`}
            >
              <AppSidebar
                isDemo={true}
                activePathOverride={revealed[activePersona.id] ? '/saved' : '/leads'}
                onNavItemClick={(href) => {
                  if (href === '/leads') {
                    setRevealed((prev) => ({ ...prev, [activePersona.id]: false }))
                  } else if (href === '/saved') {
                    setRevealed((prev) => ({ ...prev, [activePersona.id]: true }))
                  } else {
                    setRevealed((prev) => ({
                      ...prev,
                      [activePersona.id]: !revealed[activePersona.id],
                    }))
                  }
                }}
              />
            </div>

            {/* Simulated Desktop Workspace Main Panel */}
            <div className="flex-1 h-full flex flex-col bg-bg-main relative p-4 md:p-6 overflow-hidden">
              {/* BACKGROUND LAYER: The authentic leads feed dashboard */}
              <div
                className={`w-full h-full flex flex-col justify-start gap-3 transition-all duration-500 overflow-y-auto scrollbar-hide ${
                  revealed[activePersona.id]
                    ? 'opacity-30 blur-[3px] scale-98 pointer-events-none'
                    : 'opacity-100 blur-0 scale-100'
                }`}
              >
                {/* Real Leads Feed Header & Controls Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 select-none">
                  <div className="flex items-center gap-2.5">
                    {/* Toggle Sidebar Button */}
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-1.5 bg-surface/80 hover:bg-white/5 border border-white/[0.08] hover:border-white/15 rounded-xl text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center justify-center mr-1 shadow-md"
                      title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                    >
                      <Bars3Icon
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${isSidebarOpen ? 'rotate-90 text-text-secondary' : ''}`}
                      />
                    </button>
                    <h3 className="text-base font-bold text-text-primary tracking-tight">
                      Lead Feed
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[10px] font-medium font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                      <span>6 Live Signals</span>
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
                        <span className="px-1 py-0.2 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-text-secondary shrink-0">
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                  {AUDIENCE_NICHES.map((niche) => {
                    const isActive = selectedNicheId === niche.id
                    return (
                      <button
                        key={niche.id}
                        onClick={() => {
                          setSelectedNicheId(niche.id)
                          setActiveTab(niche.personaId)
                        }}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all duration-200 whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-accent-purple/10 border-accent-purple text-accent-purple shadow-[0_0_12px_rgba(168,85,247,0.18)]'
                            : 'bg-white/5 border-white/[0.06] text-text-secondary hover:bg-white/10 hover:border-white/12 hover:text-text-primary'
                        }`}
                      >
                        {niche.label}
                      </button>
                    )
                  })}
                </div>

                {/* Spacious 3-card Lead Feed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch justify-center overflow-hidden max-w-[1100px] mx-auto w-full">
                  {/* Card 1: Secondary mock lead (SEO optimization signal) */}
                  <div className="hidden md:flex items-stretch justify-center opacity-70 hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full max-w-[360px]">
                      {viewMode === 'pipeline' ? (
                        <PipelineLeadCard lead={mockLead1} index={0} />
                      ) : (
                        <LeadCard lead={mockLead1} index={0} />
                      )}
                    </div>
                  </div>

                  {/* Card 2: THE PRIMARY ACTIVE PERSONA LEAD CARD (clickable to reveal) */}
                  <div className="flex items-stretch justify-center">
                    <div className="w-full max-w-[360px]">
                      {viewMode === 'pipeline' ? (
                        <PipelineLeadCard
                          lead={appLead}
                          index={1}
                          isSelected={true}
                          onReveal={() => handleReveal(activePersona.id)}
                        />
                      ) : (
                        <LeadCard
                          lead={appLead}
                          index={1}
                          isSelected={true}
                          onReveal={() => handleReveal(activePersona.id)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Card 3: CRM migration signal */}
                  <div className="hidden md:flex items-stretch justify-center opacity-70 hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full max-w-[360px]">
                      {viewMode === 'pipeline' ? (
                        <PipelineLeadCard lead={mockLead2} index={2} />
                      ) : (
                        <LeadCard lead={mockLead2} index={2} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOREGROUND LAYER: Revealed Lead Panel floats on top like a Slack conversation card */}
              <AnimatePresence>
                {revealed[activePersona.id] && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="absolute inset-6 md:left-[10%] md:right-[10%] xl:left-[15%] xl:right-[15%] bg-surface border border-white/[0.08] shadow-[0_30px_90px_rgba(var(--rgb-black),0.95)] rounded-3xl flex flex-col p-6 justify-between z-30"
                  >
                    {/* Messaging Cockpit Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] shrink-0 select-none">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl bg-accent-${activePersona.lead.accent}/10 border border-accent-${activePersona.lead.accent}/20 flex items-center justify-center`}
                        >
                          <UserIcon
                            className={`w-4 h-4 text-accent-${activePersona.lead.accent}`}
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-text-primary leading-tight">
                            {activePersona.lead.name}
                          </h3>
                          <span className="text-[10px] text-text-secondary/60">
                            {activePersona.lead.company} · Sourced from {activePersona.lead.source}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [activePersona.id]: false }))
                        }
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-text-primary rounded-lg border border-white/10 transition-colors cursor-pointer"
                      >
                        Close Preview
                      </button>
                    </div>

                    {/* Decrypted details */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] shrink-0 flex items-center justify-between select-none my-3">
                      <div className="flex flex-col text-[11px] md:text-xs">
                        <span className="text-text-primary font-bold">
                          {activePersona.lead.name}
                        </span>
                        <span className="text-text-secondary hover:text-text-primary transition-colors font-mono text-[9px] md:text-[10px]">
                          {activePersona.lead.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-secondary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors text-[8px] font-bold uppercase tracking-wider">
                        <CheckCircleIcon className="w-[10px] h-[10px]" /> Decrypted
                      </div>
                    </div>

                    {/* Chat drafting panel */}
                    <div className="flex-1 flex flex-col justify-between bg-surface/40 border border-white/[0.08] rounded-2xl p-5 overflow-hidden min-h-[170px]">
                      <div>
                        {/* AI strategy bar */}
                        <div className="flex items-center gap-2 mb-3 select-none overflow-x-auto pb-1">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-secondary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors text-[8px] font-bold uppercase tracking-wider">
                            <SparklesIcon className="w-2 h-2" />
                            <span>Buyer Context:</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-secondary border border-border-subtle text-[8px] font-bold text-text-secondary hover:text-text-primary transition-colors">
                            <BoltIcon className="w-2 h-2" />
                            <span>{activePersona.lead.title}</span>
                          </div>
                        </div>

                        {/* Signal block -> Core Scope (Intel) */}
                        <div className="text-[11px] text-text-secondary flex items-center gap-1.5 mb-2 select-none">
                          <span className="text-text-secondary/50 font-medium">Signal:</span>
                          <span className="text-text-primary font-semibold">
                            {activePersona.lead.taskScope}
                          </span>
                        </div>

                        <div className="h-px bg-white/[0.04] mb-3" />

                        {/* Typewriter message content */}
                        <p className="text-[11px] md:text-xs text-text-primary/90 leading-relaxed font-light whitespace-pre-line overflow-y-auto max-h-[220px] md:max-h-[280px] pr-1">
                          {displayedText}
                          {isTyping && (
                            <span className="inline-block w-1 h-3 ml-0.5 bg-accent-purple animate-pulse align-middle" />
                          )}
                        </p>
                      </div>

                      {/* Sending controls footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.03] select-none shrink-0">
                        <span className="text-[8px] font-mono text-text-secondary/40 tracking-wider">
                          Contact verified · export anytime
                        </span>

                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-orange text-text-on-accent rounded-lg font-bold text-[9px] md:text-[10px] hover: transition-all">
                          Save to Pipeline
                          <CheckCircleIcon className="w-[10px] h-[10px]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom fade-out overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-20">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-60% to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Window status footer */}
          <div className="h-10 bg-white/[0.01] border-t border-white/[0.04] flex items-center px-6 justify-between text-[9px] font-mono text-text-secondary/40 shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-[11px] h-[11px] text-accent-purple" />
              <span>Product pipeline integrity verified</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Active socket connection</span>
              <ArrowRightIcon className="w-[9px] h-[9px] text-text-secondary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
