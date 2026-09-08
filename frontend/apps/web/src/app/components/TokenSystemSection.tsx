'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ChartBarSquareIcon,
  BookmarkIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import { Card, Badge } from '@/components/ui'
import LeadCard from '@/app/leads/components/LeadCard'
import { AppLead } from '@/types/lead'

const ease = [0.16, 1, 0.3, 1] as const

export default function TokenSystemSection() {
  const [tokens, setTokens] = useState(750)
  const [activeTab, setActiveTab] = useState<'leads' | 'contacts' | 'pipeline'>('leads')
  const [activeCardId, setActiveCardId] = useState<string>('card-2')

  // 5 real high-fidelity UI cards matching exact leadsData mock accents & copy
  const [leads, setLeads] = useState<AppLead[]>([
    {
      id: 'card-1',
      name: 'Andy Shepard',
      email: 'a.shepard@gmail.com',
      phone: '+1 (555) 012-3456',
      company: 'Nexus AI',
      source: 'Twitter',
      category: 'SHOPIFY DEV',
      title: 'Shopify Speed Optimization',
      signalContext:
        'Struggling with slow load times and high bounce rates on their current Shopify store.',
      role: 'Shopify Developer',
      taskScope: 'Struggling with slow load times and high bounce rates on our current Shopify store.',
      mustHave: 'Shopify optimization expertise',
      nicheBonus: 'Liquid & Core Web Vitals',
      buyerType: 'eCommerce Brand',
      urgency: 'high',
      winProb: 'high',
      nicheTags: ['E-Commerce', 'Web Dev', 'Shopify'],
      hashtags: ['#shopify', '#speed'],
      replyProbability: 92,
      status: 'new',
      timestamp: '2h ago',
      niches: ['Web Dev'],
      isClaimable: true,
      revealCost: 3,
      isRevealed: false,
    },
    {
      id: 'card-2',
      name: 'Michael Carter',
      email: 'm.carter@stellar.co',
      phone: '+1 (555) 019-2045',
      company: 'Stellar Co',
      source: 'Reddit',
      category: 'BRAND IDENTITY',
      title: 'Brand Identity & Design System',
      signalContext: 'Just raised seed round, looking to completely rebrand before product launch.',
      role: 'Brand Designer',
      taskScope: 'Just raised seed round, looking to completely rebrand before product launch.',
      mustHave: 'Modern minimal aesthetic',
      nicheBonus: 'Design systems experience',
      buyerType: 'Funded Startup',
      urgency: 'medium',
      winProb: 'high',
      nicheTags: ['SaaS', 'Branding', 'Design'],
      hashtags: ['#saas', '#design'],
      replyProbability: 88,
      status: 'new',
      timestamp: '4h ago',
      niches: ['Design'],
      isClaimable: true,
      revealCost: 3,
      isRevealed: false,
    },
    {
      id: 'card-3',
      name: 'Lily Hernandez',
      email: 'l.hernandez@nexus.com',
      phone: '+1 (555) 017-8892',
      company: 'Nexus Analytics',
      source: 'Twitter',
      category: 'SEO STRATEGY',
      title: 'SEO Technical Strategy',
      signalContext: 'Competitor just outranked them for their main keyword. Founder is stressed.',
      role: 'SEO Specialist',
      taskScope: 'Competitor just outranked us for our main keyword. Founder is stressed and need urgent fix.',
      mustHave: 'Technical SEO & Content Strategy',
      nicheBonus: 'B2B SaaS experience',
      buyerType: 'B2B SaaS',
      urgency: 'critical',
      winProb: 'high',
      nicheTags: ['B2B SaaS', 'SEO', 'Content'],
      hashtags: ['#seo', '#b2b'],
      replyProbability: 95,
      status: 'new',
      timestamp: '6h ago',
      niches: ['Marketing'],
      isClaimable: true,
      revealCost: 3,
      isRevealed: false,
    },
    {
      id: 'card-4',
      name: 'David Chen',
      email: 'd.chen@apexflow.io',
      phone: '+1 (555) 014-3321',
      company: 'ApexFlow',
      source: 'LinkedIn',
      category: 'BACKEND DEV',
      title: 'Node.js Backend Refactor',
      signalContext:
        'Looking for a dedicated Node/React team to refactor their legacy subscription architecture.',
      role: 'Full Stack Engineer',
      taskScope: 'Looking for a dedicated Node/React team to refactor legacy subscription architecture.',
      mustHave: 'Node.js & Postgres architecture',
      nicheBonus: 'Stripe Billing expertise',
      buyerType: 'Scaleup',
      urgency: 'medium',
      winProb: 'high',
      nicheTags: ['SaaS', 'Node.js', 'Refactor'],
      hashtags: ['#nodejs', '#backend'],
      replyProbability: 94,
      status: 'new',
      timestamp: '1d ago',
      niches: ['Web Dev'],
      isClaimable: true,
      revealCost: 3,
      isRevealed: false,
    },
    {
      id: 'card-5',
      name: 'Sarah Jenkins',
      email: 's.jenkins@elevateops.net',
      phone: '+1 (555) 018-7744',
      company: 'Elevate Ops',
      source: 'Threads',
      category: 'GROWTH MARKETING',
      title: 'B2B Growth Marketing',
      signalContext:
        'Scaling outbound campaigns and looking for a reliable growth partner.',
      role: 'Growth Strategist',
      taskScope: 'Scaling outbound campaigns and looking for a reliable growth partner to take over execution.',
      mustHave: 'Outbound campaign management',
      nicheBonus: 'HubSpot & Clay automation',
      buyerType: 'Agency',
      urgency: 'critical',
      winProb: 'high',
      nicheTags: ['Growth', 'GTM', 'B2B'],
      hashtags: ['#growth', '#outbound'],
      replyProbability: 91,
      status: 'new',
      timestamp: '2d ago',
      niches: ['Sales & RevOps'],
      isClaimable: true,
      revealCost: 3,
      isRevealed: false,
    },
  ])

  const handleReveal = (id: string) => {
    if (tokens < 3) {
      setTokens(750) // Reset for simulation
      return
    }
    setTokens((prev) => Math.max(0, prev - 3))
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, isRevealed: true } : lead)),
    )
  }

  const activeCardIndex = leads.findIndex((l) => l.id === activeCardId)

  return (
    <section id="tokens" className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto overflow-hidden">
      {/* Centered Header Section with Big Eyebrow */}
      <div className="text-center mb-12 md:mb-14 max-w-4xl mx-auto space-y-4">
        <span className="text-sm font-semibold text-accent-orange mb-3 block">
          Credit system
        </span>
        <h2 className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight text-text-primary leading-[1.15] max-w-2xl mx-auto">
          You control how your workflow operates.
        </h2>
        <p className="text-sm sm:text-base text-text-secondary font-light leading-relaxed max-w-xl mx-auto">
          Every subscription includes monthly tokens. Use them however you want: unlock qualified
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
              <BanknotesIcon className="w-4 h-4 text-text-secondary" />
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
                  USER INTENT FEEDS
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
                        {lead.isRevealed ? (
                          <span className="text-[10px] text-text-secondary hover:text-text-primary transition-colors font-bold uppercase tracking-wider">
                            Revealed
                          </span>
                        ) : (
                          <span className="text-[10px] text-badge-amber font-bold uppercase tracking-wider">
                            Locked
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
                  VERIFIED CONTACTS
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
                    Revealing a lead decrypts the verified email address, phone, and profile link:
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
                  PIPELINE TRACKING
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
                    Keep your saved pipeline moving: mark when you reach out, when a prospect
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
          <div className="relative w-full max-w-[370px] h-[280px] mx-auto">
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
                  className={`absolute top-0 left-0 right-0 w-full h-[260px] ${filterClass}`}
                >
                  <LeadCard
                    lead={lead}
                    index={idx}
                    isSelected={isActive}
                    onClick={() => {
                      if (isBehind) {
                        setActiveCardId(lead.id)
                        setActiveTab('leads')
                      }
                    }}
                    onReveal={() => handleReveal(lead.id)}
                  />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
