'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
  ChartBarSquareIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  BookmarkIcon,
  LockClosedIcon,
  InformationCircleIcon,
  Bars3Icon,
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
    title: string
    signalContext: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    nicheTags: string[]
    replyProbability: number
    accent: 'purple'
  }
}

// Pre-defined static mock leads to populate the spacious background Leads Feed
const mockLead1 = {
  id: 'mock-1',
  name: 'Lily Hernandez',
  email: 'l.hernandez@nexus.com',
  company: 'Nexus Analytics',
  source: 'Twitter',
  title: 'SEO Strategy For —',
  signalContext: 'Competitor just outranked them for their main keyword. Founder is stressed.',
  urgency: 'critical',
  nicheTags: ['B2B SaaS', 'SEO', 'Content'],
  replyProbability: 95,
  accent: 'purple',
  status: 'new',
  timestamp: '4h ago',
} as AppLead

const mockLead2 = {
  id: 'mock-2',
  name: 'David Anderson',
  email: 'd.anderson@prism.io',
  company: 'Prism Labs',
  source: 'Job Board',
  title: 'Sales Enablement For —',
  signalContext: 'Just hired 3 new SDRs. Clear indicator they need outbound infrastructure.',
  urgency: 'medium',
  nicheTags: ['B2B', 'Sales', 'Systems'],
  replyProbability: 75,
  accent: 'purple',
  status: 'new',
  timestamp: '3d ago',
} as AppLead

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
      title: 'Web Development For —',
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
      title: 'UI/UX Design For —',
      signalContext: 'Our current checkout page is ugly and conversions are dropping drastically.',
      urgency: 'critical',
      nicheTags: ['E-Commerce', 'UI/UX', 'Conversion'],
      replyProbability: 97,
      accent: 'purple',
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
      title: 'Brand Identity For —',
      signalContext:
        'Looking for a brand designer to completely overhaul our corporate guidelines and slide deck.',
      urgency: 'high',
      nicheTags: ['Branding', 'Vector Art', 'Figma'],
      replyProbability: 96,
      accent: 'purple',
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
      title: 'Next.js Optimization For —',
      signalContext: 'Core web vitals dragging down SEO ranking, LCP over 4 seconds.',
      urgency: 'critical',
      nicheTags: ['Next.js', 'Core Web Vitals', 'SEO'],
      replyProbability: 99,
      accent: 'purple',
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
      title: 'Paid Ads Scaling For —',
      signalContext:
        'Struggling to maintain ROAS above 1.8x, looking for creative ad testing framework.',
      urgency: 'high',
      nicheTags: ['DTC Ads', 'Meta', 'TikTok'],
      replyProbability: 95,
      accent: 'purple',
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
      title: 'B2B Demand Gen For —',
      signalContext:
        'Need an agency with proven experience in B2B demand gen and scalable pipelines.',
      urgency: 'high',
      nicheTags: ['Demand Gen', 'GTM', 'B2B'],
      replyProbability: 97,
      accent: 'purple',
    },
  },
]

export default function WhoItsForGrid() {
  const [activeTab, setActiveTab] = useState<string>('freelancers')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [isHoveredPanel, setIsHoveredPanel] = useState<boolean>(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const activePersona = PERSONAS.find((p) => p.id === activeTab) || PERSONAS[0]

  const handleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: true }))
  }

  // Construct a type-compliant AppLead representing the primary interactive card
  const appLead = {
    id: activePersona.id,
    name: activePersona.lead.name,
    email: activePersona.lead.email,
    company: activePersona.lead.company,
    source: activePersona.lead.source,
    title: activePersona.lead.title,
    signalContext: activePersona.lead.signalContext,
    urgency: activePersona.lead.urgency,
    nicheTags: activePersona.lead.nicheTags,
    replyProbability: activePersona.lead.replyProbability,
    accent: activePersona.lead.accent,
    status: revealed[activePersona.id] ? 'drafting' : 'new',
    timestamp: '2h ago',
  } as AppLead

  // Typewriting effect inside messaging cockpit draft
  useEffect(() => {
    if (revealed[activePersona.id]) {
      setIsTyping(true)
      setDisplayedText('')

      let index = 0
      const fullText = `Verified contact unlocked: ${activePersona.lead.email} · phone and profile link included. Saved to your pipeline — export anytime as CSV or Excel.`
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
      className="py-36 px-6 max-w-[1400px] mx-auto relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] glow-purple-faint pointer-events-none" />

      {/* HEADER BLOCK: Large text left, horizontal navigation segmented buttons right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-16 relative z-10">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] uppercase font-bold tracking-ultra mb-3 block text-accent-purple">
              Target Audiences
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="font-display text-[38px] md:text-[48px] font-bold tracking-tight text-text-primary leading-[1.1] mb-3"
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
          <div className="w-full flex flex-wrap gap-2.5 md:gap-3 items-center justify-center lg:justify-end bg-surface p-2 md:p-2.5 border border-white/[0.08] rounded-3xl md:rounded-4xl shadow-[0_20px_50px_rgba(var(--rgb-black),0.5)]">
            {PERSONAS.map((p) => {
              const isActive = p.id === activeTab
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveTab(p.id)
                  }}
                  className={`flex flex-col items-center justify-center gap-2 px-3 py-6 md:px-5 md:py-8 rounded-[20px] md:rounded-4xl transition-all duration-300 relative focus:outline-none cursor-pointer flex-1 sm:flex-initial min-w-[95px] md:min-w-[120px] max-w-[130px] ${
                    isActive
                      ? 'text-text-secondary hover:text-text-primary transition-colors'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {/* Active tab glow bg overlay using framer-motion */}
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-glow"
                      className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] shadow-[0_6px_24px_rgba(var(--rgb-black),0.4)] rounded-[20px] md:rounded-4xl pointer-events-none"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5 transition-colors" />
                  <span className="text-[10px] md:text-xs font-bold tracking-wide text-center leading-tight mt-1 max-w-[90px] break-words">
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
          className="w-full rounded-4xl bg-surface border border-white/[0.08] flex flex-col relative overflow-hidden transition-all duration-500 hover:border-white/15 hover:shadow-[0_45px_100px_rgba(var(--rgb-black),0.85)] shadow-[0_30px_70px_rgba(var(--rgb-black),0.6)] h-[780px] md:h-[860px] justify-between"
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
            <div className="flex-1 h-full flex flex-col bg-bg-main relative p-8 md:p-10 lg:p-12 overflow-hidden">
              {/* BACKGROUND LAYER: The leads feed dashboard (dimmed/blurred when cockpit overlays) */}
              <div
                className={`w-full h-full flex flex-col justify-start gap-5 transition-all duration-500 ${
                  revealed[activePersona.id]
                    ? 'opacity-30 blur-[3px] scale-98 pointer-events-none'
                    : 'opacity-100 blur-0 scale-100'
                }`}
              >
                {/* Leads Feed Dashboard Header */}
                <div className="flex items-end justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2.5">
                    {/* Toggle Sidebar Button */}
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className={`p-2 bg-surface/80 hover:bg-white/5 border border-white/[0.08] hover:border-white/15 rounded-xl text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center justify-center mr-2 shadow-md`}
                      title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                    >
                      <Bars3Icon
                        className={`w-[15px] h-[15px] transition-transform duration-300 ${isSidebarOpen ? 'rotate-90 text-text-secondary' : ''}`}
                      />
                    </button>
                    <h3 className="text-lg font-bold text-text-primary tracking-tight">
                      Lead Feed
                    </h3>
                    <div className="flex items-center gap-2 px-2.5 py-1 border-l-2 border-accent-purple bg-gradient-to-r from-accent-purple/10 to-transparent text-text-secondary hover:text-text-primary transition-colors text-[9px] font-bold tracking-super uppercase">
                      <span className="w-1 h-1 bg-accent-purple animate-pulse shadow-[0_0_8px_currentColor]" />
                      6 Signals
                    </div>
                  </div>
                </div>

                {/* Raycast-style Command Input */}
                <div className="relative flex items-center bg-surface/80 border border-white/[0.08] rounded-xl p-2.5 shadow-xl shrink-0 select-none my-3">
                  <MagnifyingGlassIcon className="w-[14px] h-[14px] text-text-secondary/40 ml-2" />
                  <span className="text-[11px] text-text-secondary/40 flex-1 ml-2 font-normal">
                    Ask AI or search signals... (Press ⌘K)
                  </span>
                  <div className="flex items-center gap-1.5 pr-1">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-text-secondary">
                      <SparklesIcon className="w-[11px] h-[11px] text-text-secondary" />
                      <span>AI Filter</span>
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-text-secondary">
                      ⌘K
                    </div>
                  </div>
                </div>

                {/* Spacious 3-card Lead Feed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 items-stretch overflow-hidden">
                  {/* Card 1: Secondary mock lead (SEO optimization signal) */}
                  <div className="hidden xl:flex items-stretch h-full opacity-45 hover:opacity-75 transition-opacity duration-300">
                    <PipelineLeadCard lead={mockLead1} />
                  </div>

                  {/* Card 2: THE PRIMARY ACTIVE PERSONA LEAD CARD (clickable to reveal) */}
                  <div className="flex items-stretch h-full">
                    <PipelineLeadCard lead={appLead} onClick={() => handleReveal(activePersona.id)} />
                  </div>

                  {/* Card 3: CRM migration signal */}
                  <div className="hidden md:flex items-stretch h-full opacity-45 hover:opacity-75 transition-opacity duration-300">
                    <PipelineLeadCard lead={mockLead2} />
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
                            <SparklesIcon className="w-2 h-2 animate-pulse" />
                            <span>Buyer Context:</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-secondary border border-border-subtle text-[8px] font-bold text-text-secondary hover:text-text-primary transition-colors">
                            <BoltIcon className="w-2 h-2" />
                            <span>{activePersona.lead.title}</span>
                          </div>
                        </div>

                        {/* Signal block */}
                        <div className="text-[11px] text-text-secondary flex items-center gap-1.5 mb-2 select-none">
                          <span className="text-text-secondary/50 font-medium">Signal:</span>
                          <span className="text-text-primary font-semibold">
                            {activePersona.lead.signalContext}
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

              {/* Bottom fade-out overlay (opaque gradient — no backdrop-blur for scroll perf) */}
              <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-20">
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
              <ArrowRightIcon className="w-[9px] h-[9px] text-text-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
