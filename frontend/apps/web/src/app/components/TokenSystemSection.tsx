'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LockClosedIcon,
  BanknotesIcon,
  ChevronRightIcon,
  ChartBarSquareIcon,
  BookmarkIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'
import { Card, Badge } from '@/components/ui'

const ease = [0.16, 1, 0.3, 1] as const

interface LeadCardData {
  id: string
  name: string
  email: string
  company: string
  source: string
  title: string
  signalContext: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  nicheTags: string[]
  replyProbability: number
  isLocked: boolean
}

const urgencyColors: Record<string, { badge: 'purple'; topLine: string; dotColor: string }> = {
  critical: { badge: 'purple', topLine: 'from-transparent via-accent-purple to-transparent', dotColor: 'bg-accent-purple' },
  high: { badge: 'purple', topLine: 'from-transparent via-accent-purple to-transparent', dotColor: 'bg-accent-purple' },
  medium: { badge: 'purple', topLine: 'from-transparent via-accent-purple to-transparent', dotColor: 'bg-accent-purple' },
  low: { badge: 'purple', topLine: 'from-transparent via-accent-purple to-transparent', dotColor: 'bg-accent-purple' },
}

export default function TokenSystemSection() {
  const [tokens, setTokens] = useState(750)
  const [activeTab, setActiveTab] = useState<'leads' | 'contacts' | 'pipeline'>('leads')
  const [activeCardId, setActiveCardId] = useState<string>('card-2')
  const [isRevealing, setIsRevealing] = useState<string | null>(null)

  // 3 real high-fidelity UI cards matching exact leadsData mock accents & copy
  const [leads, setLeads] = useState<LeadCardData[]>([
    {
      id: 'card-1',
      name: 'Andy Shepard',
      email: 'a.shepard@gmail.com',
      company: 'Nexus AI',
      source: 'Twitter',
      title: 'Web Development For —',
      signalContext:
        'Struggling with slow load times and high bounce rates on their current Shopify store.',
      urgency: 'high',
      nicheTags: ['E-Commerce', 'Web Dev', 'Shopify'],
      replyProbability: 92,
      isLocked: true,
    },
    {
      id: 'card-2',
      name: 'Michael Carter',
      email: 'm.carter@stellar.co',
      company: 'Stellar Co',
      source: 'Reddit',
      title: 'Brand Identity For —',
      signalContext: 'Just raised seed round, looking to completely rebrand before product launch.',
      urgency: 'medium',
      nicheTags: ['SaaS', 'Branding', 'Design'],
      replyProbability: 88,
      isLocked: true,
    },
    {
      id: 'card-3',
      name: 'Lily Hernandez',
      email: 'l.hernandez@nexus.com',
      company: 'Nexus Analytics',
      source: 'Twitter',
      title: 'SEO Strategy For —',
      signalContext: 'Competitor just outranked them for their main keyword. Founder is stressed.',
      urgency: 'critical',
      nicheTags: ['B2B SaaS', 'SEO', 'Content'],
      replyProbability: 95,
      isLocked: true,
    },
    {
      id: 'card-4',
      name: 'David Chen',
      email: 'd.chen@apexflow.io',
      company: 'ApexFlow',
      source: 'LinkedIn',
      title: 'SaaS Platform For —',
      signalContext:
        'Looking for a dedicated Node/React team to refactor their legacy subscription architecture.',
      urgency: 'medium',
      nicheTags: ['SaaS', 'Node.js', 'Refactor'],
      replyProbability: 94,
      isLocked: true,
    },
    {
      id: 'card-5',
      name: 'Sarah Jenkins',
      email: 's.jenkins@elevateops.net',
      company: 'Elevate Ops',
      source: 'Threads',
      title: 'Growth Marketing For —',
      signalContext:
        'Scaling outbound campaigns and looking for a reliable growth partner.',
      urgency: 'critical',
      nicheTags: ['Growth', 'GTM', 'B2B'],
      replyProbability: 91,
      isLocked: true,
    },
  ])

  const handleReveal = (id: string) => {
    if (tokens < 3) {
      setTokens(750) // Reset for simulation
      return
    }

    setIsRevealing(id)

    setTimeout(() => {
      setTokens((prev) => prev - 3)
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id === id) {
            return { ...lead, isLocked: false }
          }
          return lead
        }),
      )
      setIsRevealing(null)
    }, 700)
  }

  const activeCardIndex = leads.findIndex((l) => l.id === activeCardId)

  return (
    <section id="tokens" className="py-40 px-6 max-w-[1300px] mx-auto overflow-hidden">
      {/* Centered Header Section with Big Eyebrow */}
      <div className="text-center mb-24 max-w-4xl mx-auto space-y-5">
        <span className="text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
          Simple Token-Based System
        </span>
        <h2 className="font-display text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-tight text-text-primary leading-[1.1] max-w-3xl mx-auto">
          You control how your workflow operates.
        </h2>
        <p className="text-base md:text-lg text-text-secondary font-light leading-relaxed max-w-3xl mx-auto">
          Every subscription includes monthly tokens. Use them however you want—unlock qualified
          leads, reveal verified contact details, and access real-time intent intelligence. No
          bloated pricing tiers, and no paying for features you never use.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-16 items-center">
        {/* Left Column (40%): Explanatory Text & Clerk-Style Accordion/Tabs */}
        <div className="lg:col-span-5 space-y-8 text-left">
          {/* Core Balance Pill */}
          <div className="p-4 rounded-2xl bg-code-bg-dark border border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-mono tracking-widest uppercase text-text-secondary/60">
              Live Token Ledger Simulator
            </span>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl">
              <BanknotesIcon className="w-4 h-4 text-text-secondary animate-pulse" />
              <span className="font-mono text-base font-bold text-text-primary">
                {tokens} Credits
              </span>
              {tokens < 745 && (
                <button
                  onClick={() => setTokens(750)}
                  className="ml-2 text-xs text-text-secondary/40 hover:text-text-primary transition-colors"
                  title="Reset Token Balance"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Clerk-Style Feature Tabs Accordion */}
          <div className="space-y-4">
            {/* Accordion Item 1 */}
            <div
              onClick={() => setActiveTab('leads')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                activeTab === 'leads'
                  ? 'bg-white/[0.03] border-white/10 shadow-[inset_0_1px_0_rgba(var(--rgb-white),0.05)]'
                  : 'bg-transparent border-transparent hover:bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-mono tracking-widest uppercase ${activeTab === 'leads' ? 'text-text-secondary hover:text-text-primary transition-colors' : 'text-text-secondary'}`}
                >
                  ● USER INTENT FEEDS
                </span>
                <ChevronRightIcon
                  className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${activeTab === 'leads' ? 'rotate-90' : ''}`}
                />
              </div>

              {activeTab === 'leads' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3, ease }}
                  className="mt-3 overflow-hidden text-xs text-text-secondary space-y-3 pl-3"
                >
                  <p className="leading-relaxed">
                    This stack simulates a live lead feed. Selecting a card focuses on the
                    prospect&apos;s real pain point. Clicking &apos;Reveal&apos; costs 3 tokens,
                    decrypting the verified email address and contact name instantly.
                  </p>

                  {/* Target selectors within Accordion */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    {leads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveCardId(lead.id)
                        }}
                        className={`text-left px-3 py-2 rounded-lg text-11 font-mono flex items-center justify-between border transition-all ${
                          activeCardId === lead.id
                            ? 'bg-white/5 border-white/10 text-text-primary font-bold'
                            : 'bg-transparent border-transparent text-text-secondary/60 hover:text-text-primary'
                        }`}
                      >
                        <span>
                          {lead.company} ({lead.source})
                        </span>
                        {lead.isLocked ? (
                          <span className="text-[10px] text-badge-amber font-bold uppercase tracking-wider">
                            Locked
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary hover:text-text-primary transition-colors font-bold uppercase tracking-wider">
                            Revealed
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Accordion Item 2 */}
            <div
              onClick={() => setActiveTab('contacts')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-white/[0.03] border-white/10 shadow-[inset_0_1px_0_rgba(var(--rgb-white),0.05)]'
                  : 'bg-transparent border-transparent hover:bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-mono tracking-widest uppercase ${activeTab === 'contacts' ? 'text-text-secondary hover:text-text-primary transition-colors' : 'text-text-secondary'}`}
                >
                  ○ VERIFIED CONTACTS
                </span>
                <ChevronRightIcon
                  className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${activeTab === 'contacts' ? 'rotate-90' : ''}`}
                />
              </div>

              {activeTab === 'contacts' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3, ease }}
                  className="mt-3 overflow-hidden text-xs text-text-secondary pl-3"
                >
                  <p className="leading-relaxed">
                    Revealing a lead decrypts the verified email address, phone, and profile link —
                    export anytime as CSV or Excel.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Accordion Item 3 */}
            <div
              onClick={() => setActiveTab('pipeline')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-white/[0.03] border-white/10 shadow-[inset_0_1px_0_rgba(var(--rgb-white),0.05)]'
                  : 'bg-transparent border-transparent hover:bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-mono tracking-widest uppercase ${activeTab === 'pipeline' ? 'text-text-secondary hover:text-text-primary transition-colors' : 'text-text-secondary'}`}
                >
                  ○ PIPELINE TRACKING
                </span>
                <ChevronRightIcon
                  className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${activeTab === 'pipeline' ? 'rotate-90' : ''}`}
                />
              </div>

              {activeTab === 'pipeline' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3, ease }}
                  className="mt-3 overflow-hidden text-xs text-text-secondary pl-3"
                >
                  <p className="leading-relaxed">
                    Keep your saved pipeline moving — mark when you reach out, when a prospect
                    replies, and watch every deal progress to close.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (60%): Layered Offset 3D Stack (Matches Clerk Components perfectly) */}
        <div className="lg:col-span-7 flex items-center justify-center py-20 relative min-h-[460px] md:min-h-[500px]">
          {/* Decorative Background grid glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--rgb-white),0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* Layered sheets container */}
          <div className="relative w-full max-w-[420px] h-[340px]">
            {leads.map((lead, idx) => {
              const isActive = lead.id === activeCardId

              // Calculate horizontal perspective layout
              const offset = idx - activeCardIndex
              const isBehind = Math.abs(offset) > 0

              // Ensure exactly 3 cards are always visible by adjusting offset boundaries
              let displayOffset = offset
              if (offset === 2 && activeCardIndex !== 0) {
                displayOffset = 999 // Hide beyond first-card boundary
              }
              if (offset === -2 && activeCardIndex !== leads.length - 1) {
                displayOffset = -999 // Hide beyond last-card boundary
              }

              let zIndex = 20
              let xTranslation = 0
              let scaleVal = 1.05
              let rotation = 0
              let filterClass = 'blur-0 opacity-100 scale-100 pointer-events-auto'

              if (displayOffset === 0) {
                zIndex = 20
                xTranslation = 0
                scaleVal = 1.05
                rotation = 0
                filterClass = 'blur-0 opacity-100 scale-100 pointer-events-auto'
              } else if (displayOffset === -1) {
                // Shifted to the left/behind
                zIndex = 10
                xTranslation = -110
                scaleVal = 0.88
                rotation = -6
                filterClass =
                  'blur-[1.5px] opacity-50 hover:opacity-75 cursor-pointer pointer-events-auto'
              } else if (displayOffset === 1) {
                // Shifted to the right/behind
                zIndex = 10
                xTranslation = 110
                scaleVal = 0.88
                rotation = 6
                filterClass =
                  'blur-[1.5px] opacity-50 hover:opacity-75 cursor-pointer pointer-events-auto'
              } else if (displayOffset === -2) {
                // Far left/behind card (visible when active is the last card)
                zIndex = 5
                xTranslation = -200
                scaleVal = 0.76
                rotation = -12
                filterClass =
                  'blur-[3px] opacity-25 hover:opacity-50 cursor-pointer pointer-events-auto'
              } else if (displayOffset === 2) {
                // Far right/behind card (visible when active is the first card)
                zIndex = 5
                xTranslation = 200
                scaleVal = 0.76
                rotation = 12
                filterClass =
                  'blur-[3px] opacity-25 hover:opacity-50 cursor-pointer pointer-events-auto'
              } else {
                // Completely hidden cards out of sight
                zIndex = 0
                scaleVal = 0.7
                xTranslation = displayOffset * 180
                filterClass = 'opacity-0 pointer-events-none'
              }

              return (
                <motion.div
                  key={lead.id}
                  style={{ zIndex }}
                  animate={{
                    x: xTranslation,
                    scale: scaleVal,
                    rotate: rotation,
                  }}
                  transition={{ duration: 0.6, ease }}
                  onClick={() => {
                    if (isBehind) {
                      setActiveCardId(lead.id)
                      setActiveTab('leads')
                    }
                  }}
                  className={`absolute top-0 left-0 right-0 w-full ${filterClass}`}
                >
                  <Card
                    variant="elevated"
                    padding="md"
                    hover
                    className="h-full flex flex-col"
                  >
                    {/* Top edge highlight */}
                    <div className={`absolute top-0 left-0 right-0 h-[1px] opacity-25 group-hover:opacity-60 bg-gradient-to-r ${urgencyColors[lead.urgency].topLine}`} />

                    {/* Header: Source badge + Urgency badge + Bookmark */}
                    <div className="flex items-center justify-between mb-5 w-full shrink-0 select-none">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${urgencyColors[lead.urgency].dotColor}`} />
                        <Badge size="sm" color="purple">
                          Lead Hunter Club
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge size="sm" color={urgencyColors[lead.urgency].badge}>
                          <ChartBarSquareIcon className="w-[10px] h-[10px] mr-1" />
                          {lead.urgency}
                        </Badge>
                        <div className="p-1.5 rounded-lg border transition-all cursor-pointer bg-white/5 border-transparent text-text-secondary hover:bg-white/10 hover:text-white hover:border-border-subtle">
                          <BookmarkIcon className="w-[14px] h-[14px] text-text-secondary/30" />
                        </div>
                      </div>
                    </div>

                    {/* Company title as category */}
                    <h4 className="text-11 font-semibold tracking-[0.18em] text-text-secondary/60 uppercase mb-3 shrink-0">
                      {lead.company}
                    </h4>

                    {/* Signal quote */}
                    <h3 className="text-[17px] font-normal tracking-tight leading-[1.55] text-text-primary mb-6 flex-grow">
                      &quot;{lead.signalContext}&quot;
                    </h3>

                    {/* Tags row + AI Reply Probability */}
                    <div className="flex flex-wrap gap-2 mb-2 shrink-0">
                      {lead.replyProbability > 0 && (
                        <Badge size="sm" color="purple">
                          {lead.replyProbability}% Reply Match
                        </Badge>
                      )}
                      {lead.nicheTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-md border bg-white/[0.03] text-text-secondary/50 border-white/[0.05] hover:bg-white/[0.07] hover:text-text-secondary hover:border-white/10 transition-all duration-200 cursor-default"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="w-full pt-5 flex items-center justify-between shrink-0 border-t border-border-subtle mt-auto gap-3">
                      <div className="flex items-center gap-3 select-none min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 overflow-hidden shrink-0">
                          {!lead.isLocked ? (
                            <span className="text-11 font-bold text-text-primary uppercase">
                              {lead.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          ) : (
                            <LockClosedIcon className="w-[14px] h-[14px] text-text-secondary" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 pointer-events-none min-w-0">
                          {!lead.isLocked ? (
                            <>
                              <div className="text-sm font-bold text-text-primary truncate">{lead.name}</div>
                              <div className="text-[10px] text-text-secondary truncate">{lead.email}</div>
                            </>
                          ) : (
                            <>
                              <div className="h-2 w-24 rounded-[4px] bg-white/10 blur-[1px]" />
                              <div className="h-2 w-32 rounded-[4px] bg-white/5 blur-[1px]" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!lead.isLocked ? (
                          <div className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[12px] transition-all cursor-pointer bg-white/5 hover:bg-white/10 border border-transparent hover:border-border-subtle text-text-primary/90">
                            <SparklesIcon className="w-3 h-3" />
                            Engage
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isActive) handleReveal(lead.id)
                            }}
                            disabled={isRevealing !== null || !isActive}
                            className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[12px] transition-all cursor-pointer bg-white/5 hover:bg-white/10 border border-transparent hover:border-border-subtle text-text-primary/90"
                          >
                            {isRevealing === lead.id ? (
                              <span className="animate-pulse">Decoding...</span>
                            ) : (
                              <>
                                Reveal
                                <span className="flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-widest ml-1">
                                  <BanknotesIcon className="w-3 h-3" /> -3
                                </span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
