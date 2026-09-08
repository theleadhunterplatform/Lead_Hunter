'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckIcon,
  SparklesIcon,
  GlobeAltIcon,
  BoltIcon,
  ArrowRightIcon,
  BookmarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/solid'
import { Card } from '@/components/ui/Card'

const springTransition = { type: 'spring', stiffness: 320, damping: 32 } as const

interface CapabilityCard {
  id: string
  indexStr: string
  shortLabel: string
  title: string
  description: string
  tag: string
}

// ─── Floating Amber Mosaic Tiles for Inactive Cards (Parley Homage) ────────────
function AmberMosaicScatter({ cardIndex }: { cardIndex: number }) {
  const tilePatterns = [
    // 01. Scatter
    [
      { top: '22%', left: '48%', size: 'w-4 h-4', opacity: 'bg-accent-orange/80' },
      { top: '36%', left: '32%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-400/40' },
      { top: '46%', left: '60%', size: 'w-3 h-3', opacity: 'bg-accent-orange/60' },
      { top: '60%', left: '40%', size: 'w-4 h-4', opacity: 'bg-accent-orange/90' },
      { top: '70%', left: '62%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-500/70' },
    ],
    // 02. Scatter
    [
      { top: '20%', left: '38%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/85' },
      { top: '30%', left: '56%', size: 'w-4 h-4', opacity: 'bg-amber-400/50' },
      { top: '44%', left: '30%', size: 'w-3 h-3', opacity: 'bg-accent-orange/70' },
      { top: '56%', left: '64%', size: 'w-4 h-4', opacity: 'bg-accent-orange/90' },
      { top: '68%', left: '44%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-500/60' },
    ],
    // 03. Scatter
    [
      { top: '20%', left: '55%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/80' },
      { top: '32%', left: '30%', size: 'w-4 h-4', opacity: 'bg-accent-orange/90' },
      { top: '36%', left: '68%', size: 'w-3 h-3', opacity: 'bg-amber-400/40' },
      { top: '48%', left: '45%', size: 'w-4 h-4', opacity: 'bg-amber-500/80' },
      { top: '54%', left: '20%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/70' },
      { top: '62%', left: '36%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-400/50' },
      { top: '60%', left: '72%', size: 'w-3 h-3', opacity: 'bg-accent-orange/60' },
      { top: '72%', left: '50%', size: 'w-4 h-4', opacity: 'bg-accent-orange/85' },
    ],
    // 04. Scatter
    [
      { top: '20%', left: '60%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/85' },
      { top: '28%', left: '35%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-400/60' },
      { top: '36%', left: '60%', size: 'w-4 h-4', opacity: 'bg-accent-orange/50' },
      { top: '48%', left: '48%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-500/70' },
      { top: '55%', left: '68%', size: 'w-4 h-4', opacity: 'bg-accent-orange/90' },
      { top: '66%', left: '26%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/80' },
      { top: '70%', left: '52%', size: 'w-3.5 h-3.5', opacity: 'bg-amber-400/75' },
      { top: '70%', left: '78%', size: 'w-3.5 h-3.5', opacity: 'bg-accent-orange/60' },
    ],
  ]

  const tiles = tilePatterns[cardIndex % tilePatterns.length]

  return (
    <div className="relative w-full h-44 my-auto select-none pointer-events-none">
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.7, scale: 0.95 }}
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 3.5 + i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.2,
          }}
          style={{ top: tile.top, left: tile.left }}
          className={`absolute ${tile.size} ${tile.opacity} rounded-sm shadow-[0_2px_8px_rgba(255,107,0,0.25)]`}
        />
      ))}
    </div>
  )
}

// ─── Visual 1: Fresh Daily Leads Interceptor Visual ───────────────────────────
function FreshLeadsInteractiveVisual() {
  const [activePlatform, setActivePlatform] = useState<'All' | 'Twitter' | 'Reddit' | 'LinkedIn'>('All')

  const leads = [
    {
      platform: 'Twitter / X',
      time: '2m ago',
      title: 'Looking for a Shopify Plus developer to rebuild checkout before Black Friday ($6,500)',
      budget: '$6.5k',
      intent: '98%',
      user: '@david_dtc',
      badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      platform: 'Reddit',
      time: '5m ago',
      title: 'Our agency is scaling to $100k/mo and desperately needs an Apollo & Clay cold email RevOps setup',
      budget: 'High',
      intent: '95%',
      user: 'u/growth_founder',
      badgeClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    },
    {
      platform: 'LinkedIn',
      time: '11m ago',
      title: 'Hiring a senior Next.js 15 contract engineer to optimize our Core Web Vitals score',
      budget: '$8k/mo',
      intent: '92%',
      user: 'Sarah M. (CTO)',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
  ]

  const filtered = activePlatform === 'All' 
    ? leads 
    : leads.filter(l => l.platform.toLowerCase().includes(activePlatform.toLowerCase()))

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between bg-[#0B0D14] rounded-xl border border-white/[0.08] shadow-inner relative overflow-hidden">
      {/* Platform Filter Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-accent-orange uppercase">
            REAL-TIME RADAR
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['All', 'Twitter', 'Reddit', 'LinkedIn'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
                activePlatform === p
                  ? 'bg-accent-orange text-black font-bold shadow-sm'
                  : 'bg-white/5 text-text-secondary/70 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-2 my-auto">
        {filtered.map((lead, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="p-2.5 rounded-lg bg-surface-secondary/60 border border-white/[0.06] hover:border-white/15 transition-all flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-medium ${lead.badgeClass}`}>
                  {lead.platform}
                </span>
                <span className="text-[9px] font-mono text-text-secondary/60">{lead.user}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-accent-mint">{lead.intent} INTENT</span>
                <span className="text-[9px] font-mono text-text-secondary/50">{lead.time}</span>
              </div>
            </div>
            <p className="text-xs text-text-primary/95 font-medium leading-snug line-clamp-1 mt-0.5">
              {lead.title}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] font-mono text-text-secondary/60">
        <span>3,480 SIGNALS / HR</span>
        <span className="text-accent-orange font-medium">SUB-SECOND LATENCY</span>
      </div>
    </div>
  )
}

// ─── Visual 2: Lead Intelligence with Revealed Contacts (Parley Plan Style) ─────
function LeadIntelligenceInteractiveVisual() {
  const [revealed, setRevealed] = useState(true)
  const [checklist, setChecklist] = useState([
    { label: 'Budget Verified: $8,000+ confirmed via funding signal', done: true },
    { label: 'Decision Maker Identified: Alex K. (Head of Growth)', done: true },
    { label: 'Verified Direct Email & Mobile: a.k***@vanguard.io', done: true },
    { label: 'Pain Point: Scaling CAC on Meta/TikTok in Q4', done: true },
    { label: 'Outreach Angle Generated & Saved to Pipeline', done: true },
  ])

  const toggleCheck = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, done: !item.done } : item))
    )
  }

  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between bg-[#0B0D14] rounded-xl border border-white/[0.08] shadow-inner relative overflow-hidden">
      {/* Floating Card inside (Parley Checklist Homage with LHC Content) */}
      <div className="max-w-md w-full mx-auto p-4 rounded-xl bg-gradient-to-b from-[#141724] to-[#0E1018] border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.7)] my-auto">
        {/* Top Profile Header */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent-orange/15 border border-accent-orange/30 flex items-center justify-center text-accent-orange font-bold text-xs">
              AK
            </div>
            <div>
              <div className="text-xs font-bold text-text-primary leading-none">Alex K.</div>
              <div className="text-[10px] text-text-secondary/70 mt-0.5">Vanguard DTC • Shopify Plus</div>
            </div>
          </div>
          <span className="text-[9px] font-mono text-accent-orange/90 bg-accent-orange/10 px-2 py-0.5 rounded-full border border-accent-orange/20 font-bold">
            INTEL REVEALED
          </span>
        </div>

        {/* Action / Intel Checklist */}
        <div className="space-y-1.5">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleCheck(idx)}
              className="flex items-center gap-2.5 cursor-pointer group py-0.5 select-none"
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                  item.done
                    ? 'bg-accent-orange text-black font-bold shadow-[0_0_8px_rgba(255,107,0,0.4)]'
                    : 'border border-white/25 group-hover:border-white/50 bg-white/5'
                }`}
              >
                {item.done && <CheckIcon className="w-3 h-3 stroke-[3]" />}
              </div>
              <span
                className={`text-xs transition-colors truncate ${
                  item.done
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary/60 group-hover:text-text-secondary'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status */}
      <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary/60 pt-2 border-t border-white/[0.06]">
        <span>VERIFIED ENRICHMENT</span>
        <span className="text-accent-mint font-medium">100% DELIVERABLE</span>
      </div>
    </div>
  )
}

// ─── Visual 3: Track Every Touch (Pipeline Stages) ────────────────────────────
function TrackEveryTouchInteractiveVisual() {
  const [currentStage, setCurrentStage] = useState<number>(2) // Contacted by default

  const stages = [
    { label: 'Revealed', count: '18 leads', icon: SparklesIcon, desc: 'Contacts unlocked' },
    { label: 'Saved', count: '12 leads', icon: BookmarkIcon, desc: 'Added to target list' },
    { label: 'Contacted', count: '7 leads', icon: PaperAirplaneIcon, desc: 'Outreach dispatched' },
    { label: 'Replied', count: '4 deals', icon: ChatBubbleLeftRightIcon, desc: 'Conversation active' },
  ]

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between bg-[#0B0D14] rounded-xl border border-white/[0.08] shadow-inner relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-accent-orange uppercase">
            PIPELINE STAGE TRACKER
          </span>
        </div>
        <span className="text-[10px] font-mono text-accent-mint font-bold">+92% CONVERSION RATE</span>
      </div>

      {/* Interactive Stages Row */}
      <div className="grid grid-cols-4 gap-2 my-auto">
        {stages.map((stage, idx) => {
          const Icon = stage.icon
          const isSelected = currentStage === idx
          const isPassed = currentStage >= idx

          return (
            <div
              key={stage.label}
              onClick={() => setCurrentStage(idx)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-accent-orange/15 border-accent-orange/40 shadow-[0_4px_16px_rgba(255,107,0,0.2)]'
                  : 'bg-surface-secondary/60 border-white/[0.06] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isPassed ? 'bg-accent-orange/20 text-accent-orange' : 'bg-white/5 text-text-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono text-text-secondary/70">{stage.count}</span>
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary leading-tight">{stage.label}</div>
                <div className="text-[9px] text-text-secondary/60 truncate mt-0.5">{stage.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pipeline Progression Bar */}
      <div className="pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary/60 mb-1.5">
          <span>PIPELINE VELOCITY</span>
          <span className="text-white font-medium">STAGE {currentStage + 1} OF 4 ACTIVE</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-orange to-accent-mint rounded-full transition-all duration-300"
            style={{ width: `${((currentStage + 1) / 4) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Visual 4: Credits Based, Not Seat Based (Credit Economics) ────────────────
function CreditEconomicsInteractiveVisual() {
  const [selectedTier, setSelectedTier] = useState<'solo' | 'growth' | 'agency'>('growth')

  const tiers = {
    solo: { credits: '250', cost: '3 / reveal', label: 'Solo Operator', rollover: '100% Rollover' },
    growth: { credits: '750', cost: '3 / reveal', label: 'Growth Agency', rollover: '100% Rollover' },
    agency: { credits: '2,000', cost: '3 / reveal', label: 'Scale Operations', rollover: '100% Rollover' },
  }

  const current = tiers[selectedTier]

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between bg-[#0B0D14] rounded-xl border border-white/[0.08] shadow-inner relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-accent-mint uppercase">
            CREDIT BALANCE ENGINE
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-secondary/60">0 SEAT LOCK-INS</span>
      </div>

      {/* Tier Selector Buttons */}
      <div className="my-auto space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(['solo', 'growth', 'agency'] as const).map((tierKey) => (
            <button
              key={tierKey}
              onClick={() => setSelectedTier(tierKey)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-all border ${
                selectedTier === tierKey
                  ? 'bg-accent-orange text-black border-accent-orange font-bold shadow-md'
                  : 'bg-white/5 text-text-secondary border-white/10 hover:border-white/20'
              }`}
            >
              {tierKey}
            </button>
          ))}
        </div>

        {/* Big Credit Meter Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-surface-secondary/80 to-[#121520] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-text-secondary/70 uppercase">MONTHLY REVEAL CREDITS</div>
            <div className="text-2xl font-display font-bold text-white tracking-tight mt-0.5">
              {current.credits} <span className="text-xs font-mono font-normal text-accent-orange">Credits</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-accent-mint font-bold px-2 py-0.5 rounded bg-accent-mint/10 border border-accent-mint/20">
              {current.rollover}
            </div>
            <div className="text-[9px] font-mono text-text-secondary/60 mt-1">NO EXPIRATION DATE</div>
          </div>
        </div>
      </div>

      {/* Bottom Features */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] font-mono text-text-secondary/60">
        <span>PAY PER VALUE</span>
        <span className="text-white/80">SCALE SEATLESSLY</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN CAPABILITIES SECTION (Parley Layout + LHC Original Content) ─────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function FeaturesSection() {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(1) // Card 2 active by default, exactly like Parley screenshot!

  const cards: CapabilityCard[] = [
    {
      id: 'fresh-leads',
      indexStr: '01.',
      shortLabel: 'Fresh Daily Leads',
      tag: 'Real-time interception',
      title: 'Fresh Daily Leads from Multiple Platforms',
      description:
        'Opportunities surface in real-time from obscure forums, social networks, and intent sites. Monitor high-intent queries across LinkedIn, Reddit, Twitter/X, and Threads the exact second buyers ask for help.',
    },
    {
      id: 'lead-intel',
      indexStr: '02.',
      shortLabel: 'Lead Intelligence',
      tag: 'Deep intelligence',
      title: 'Lead Intelligence with Revealed Contacts',
      description:
        'Analyze and enrich prospect profiles instantly to understand exactly who you are speaking to. See urgency levels, budget cues, and comprehensive buyer context with verified contact details ready to act on.',
    },
    {
      id: 'pipeline-momentum',
      indexStr: '03.',
      shortLabel: 'Track Every Touch',
      tag: 'Pipeline momentum',
      title: 'Track Every Touch',
      description:
        'Keep your pipeline moving by logging every interaction. Reveal a lead, save it, mark when you reach out, and see where each conversation stands at a glance.',
    },
    {
      id: 'credit-economics',
      indexStr: '04.',
      shortLabel: 'Credit Economics',
      tag: 'Credit economics',
      title: 'Credits Based, Not Seat Based',
      description:
        'Pay only for the specific actions you perform. Solo builders, growth consultancies, and digital agencies can scale usage smoothly without complex monthly seat commitments or locked features.',
    },
  ]

  const renderActiveVisual = (index: number) => {
    switch (index) {
      case 0:
        return <FreshLeadsInteractiveVisual />
      case 1:
        return <LeadIntelligenceInteractiveVisual />
      case 2:
        return <TrackEveryTouchInteractiveVisual />
      case 3:
        return <CreditEconomicsInteractiveVisual />
      default:
        return <LeadIntelligenceInteractiveVisual />
    }
  }

  return (
    <section
      id="features"
      className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative overflow-hidden border-t border-white/[0.04]"
    >
      {/* ═══ ASYMMETRIC HEADER (Parley Layout Reference + LHC Content) ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          {/* Normal eyebrow inspired by Parley */}
          <span className="text-sm font-semibold text-accent-orange mb-3 block">
            Capabilities
          </span>
          <h2 className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight text-white leading-[1.15]">
            Engineered for speed,
            <br />
            <span className="text-text-secondary/70">built for conversion.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-md"
        >
          <p className="text-sm md:text-base text-text-secondary font-light leading-relaxed">
            A complete, unified acquisition stack designed to qualify, analyze, and convert
            high-value clients effortlessly across multi-platform networks.
          </p>
        </motion.div>
      </div>

      {/* ═══ DESKTOP ACCORDION CARDS (Parley Layout Match) ═══ */}
      <div className="hidden md:flex flex-row gap-3 lg:gap-4 items-stretch min-h-[460px] h-[480px] w-full relative z-10">
        {cards.map((card, i) => {
          const isActive = activeCardIndex === i

          return (
            <Card
              variant="elevated"
              padding="md"
              hover={true}
              className={isActive
                ? 'flex-[2.4] bg-[#141724] border border-white/20 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)] rounded-[24px] p-6 flex flex-col justify-between cursor-default'
                : 'flex-1 bg-[#10121A] hover:bg-[#141722] border border-white/[0.08] hover:border-white/20 rounded-[20px] p-5 flex flex-col justify-between cursor-pointer group shadow-md'}
              onMouseEnter={() => setActiveCardIndex(i)}
              onClick={() => setActiveCardIndex(i)}
            >
              {isActive ? (
                /* ─── Active Expanded Card ─── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col justify-between"
                >
                  {/* Top: Rich Interactive Capability Preview */}
                  <div className="w-full h-[260px] rounded-xl overflow-hidden relative">
                    {renderActiveVisual(i)}
                  </div>

                  {/* Bottom: Narrative Display Title & Description */}
                  <div className="mt-3 pt-2.5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-accent-orange uppercase tracking-wider">
                        {card.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-xl lg:text-2xl font-bold tracking-tight text-white mb-1.5 leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-text-secondary text-xs lg:text-sm leading-relaxed font-light line-clamp-3">
                      {card.description}
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* ─── Inactive Collapsed Card (Parley Amber Mosaic + LHC Content) ─── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="h-full flex flex-col justify-between items-start select-none"
                >
                  {/* Top: Large Numeric Indicator */}
                  <span className="text-3xl lg:text-4xl font-display font-bold text-white/20 group-hover:text-white/40 transition-colors font-mono tracking-tighter">
                    {card.indexStr}
                  </span>

                  {/* Center: Abstract Floating Amber Mosaic */}
                  <AmberMosaicScatter cardIndex={i} />

                  {/* Bottom: Clean Title Label */}
                  <div className="w-full border-t border-white/[0.06] pt-3">
                    <span className="text-sm font-semibold text-text-secondary/80 group-hover:text-white transition-colors tracking-tight line-clamp-1 block">
                      {card.shortLabel}
                    </span>
                  </div>
                </motion.div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ═══ MOBILE ACCORDION (Vertical Fallback for < md screens) ═══ */}
      <div className="md:hidden flex flex-col gap-3 relative z-10">
        {cards.map((card, i) => {
          const isActive = activeCardIndex === i

          return (
            <Card
                key={card.id}
                hover={false}
                variant="elevated"
                padding="md"
                onClick={() => setActiveCardIndex(i)}
                className={isActive ? 'bg-[#141724] border-white/20 shadow-lg' : 'bg-[#10121A] border-white/[0.08]'}
              >
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-accent-orange">
                    {card.indexStr}
                  </span>
                  <span className="text-base font-semibold text-white">{card.shortLabel}</span>
                </div>
                <ArrowRightIcon
                  className={`w-4 h-4 text-accent-orange transition-transform duration-300 ${
                    isActive ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {isActive && (
                <div className="mt-4 pt-3 border-t border-white/[0.08]">
                  <div className="h-[260px] w-full rounded-xl overflow-hidden mb-3">
                    {renderActiveVisual(i)}
                  </div>
                  <h4 className="font-display text-lg font-bold text-white mb-1.5">
                    {card.title}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-light">
                    {card.description}
                  </p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
