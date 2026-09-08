'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import PipelineLeadCard from '@/app/leads/components/PipelineLeadCard'
import type { AppLead } from '@/types/lead'

const INITIAL_GIFT_LEADS: AppLead[] = [
  {
    id: 'mock-shopify',
    name: 'Sarah Jenkins',
    company: 'Lumina DTC',
    source: 'Shopify Plus',
    category: 'WEB DEVELOPMENT',
    title: 'Custom Shopify Plus Redesign',
    taskScope: 'Looking to overhaul our DTC store before Q4. Need custom Liquid theme, 3D product embeds, and sub-second load times.',
    signalContext: 'Looking to overhaul our DTC store before Q4.',
    role: 'Founder',
    mustHave: 'Liquid mastery, custom checkout architecture',
    nicheBonus: 'Shopify Plus migration',
    buyerType: 'DTC Brand',
    urgency: 'critical',
    winProb: 'high',
    nicheTags: ['Shopify Plus', 'Custom Theme', '$8.5k Budget'],
    hashtags: ['#shopify', '#ecommerce'],
    niches: ['Development', 'Web Dev'],
    email: 'sarah@luminadtc.com',
    phone: '+1 (555) 234-8901',
    replyProbability: 96,
    accent: 'orange',
    status: 'new',
    timestamp: 'Just now',
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'mock-ads',
    name: 'Marcus Vance',
    company: 'Aurum Jewelry',
    source: 'Meta Ads',
    category: 'PAID ADVERTISING',
    title: 'Q4 Meta Ads Scaling & Audit',
    taskScope: 'Spending $15k/mo on Meta. Looking for an elite media buyer or boutique agency to audit our account and scale past 3.5x ROAS.',
    signalContext: 'Spending $15k/mo on Meta. Looking for an elite media buyer.',
    role: 'Growth Director',
    mustHave: 'ROAS scaling past 3.5x, creative fatigue auditing',
    nicheBonus: 'DTC luxury experience',
    buyerType: 'Funded eCommerce',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['Meta Ads', 'Scale', '$15k/mo Spend'],
    hashtags: ['#metaads', '#growth'],
    niches: ['Marketing', 'Paid Ads'],
    email: 'marcus@aurumjewelry.com',
    phone: '+1 (555) 345-6789',
    replyProbability: 94,
    accent: 'purple',
    status: 'new',
    timestamp: '12m ago',
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
  {
    id: 'mock-webflow',
    name: 'Priya Sharma',
    company: 'Starlight SaaS',
    source: 'Webflow',
    category: 'AI & AUTOMATION',
    title: 'Client Portal & Webhook Pipelines',
    taskScope: 'Need a 2-week sprint to build our client portal in Webflow with Make.com webhook automation and Airtable sync.',
    signalContext: 'Need a 2-week sprint to build our client portal.',
    role: 'Co-founder',
    mustHave: 'Webflow custom code, Make.com integrations',
    nicheBonus: 'Airtable database architecture',
    buyerType: 'Seed-stage SaaS',
    urgency: 'high',
    winProb: 'high',
    nicheTags: ['Webflow', 'Make.com', '$6k Budget'],
    hashtags: ['#webflow', '#automation'],
    niches: ['AI & Automation', 'Development'],
    email: 'priya@starlightsaas.io',
    phone: '+1 (555) 456-7890',
    replyProbability: 92,
    accent: 'mint',
    status: 'new',
    timestamp: '28m ago',
    isClaimable: true,
    revealCost: 3,
    isRevealed: false,
  },
]

export function LeadGiftWrapStage() {
  const [leads, setLeads] = useState<AppLead[]>(INITIAL_GIFT_LEADS)
  const [activeIdx, setActiveIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const reduceMotion = useReducedMotion()

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % leads.length)
  }

  const currentLead = leads[activeIdx]
  const secondLead = leads[(activeIdx + 1) % leads.length]
  const thirdLead = leads[(activeIdx + 2) % leads.length]

  return (
    <div
      className="w-full max-w-[360px] flex flex-col items-center justify-center select-none py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Notification Status Header (Matches reference image) */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          {/* Bell with notification count */}
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-orange-500 text-white shadow-sm">
              3
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
            <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <span className="text-zinc-200 font-medium">Ready to Unpack</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] font-mono text-orange-400 transition-colors cursor-pointer"
        >
          <span>Tap to draw</span>
          <span className="text-zinc-500 font-sans">({activeIdx + 1}/3)</span>
        </button>
      </div>

      {/* Gift Wrap / Envelope Sleeve Container */}
      <div className="relative w-full h-[300px] flex items-end justify-center">
        {/* Envelope Back Plate */}
        <div className="absolute inset-0 top-6 rounded-3xl bg-[#131316] border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />

        {/* Stacked Lead Cards Inside the Wrap */}
        <div className="absolute inset-x-2 top-0 bottom-6 flex flex-col items-center">
          {/* Card 3 (Furthest Back) */}
          <div
            className="absolute w-[90%] transition-all duration-500 pointer-events-none"
            style={{
              top: isHovered ? '-14px' : '4px',
              transform: 'scale(0.88)',
              opacity: 0.35,
              filter: 'blur(0.5px)',
            }}
          >
            <PipelineLeadCard lead={thirdLead} index={2} />
          </div>

          {/* Card 2 (Middle) */}
          <div
            className="absolute w-[95%] transition-all duration-500 pointer-events-none"
            style={{
              top: isHovered ? '-6px' : '10px',
              transform: 'scale(0.94)',
              opacity: 0.65,
            }}
          >
            <PipelineLeadCard lead={secondLead} index={1} />
          </div>

          {/* Card 1 (Front Active Card - EXACT Lead Feed Page Card!) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLead.id}
              initial={reduceMotion ? false : { y: -35, opacity: 0, scale: 0.96 }}
              animate={{
                y: isHovered ? -20 : 0,
                opacity: 1,
                scale: 1,
              }}
              exit={reduceMotion ? false : { y: -80, opacity: 0, scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full z-10"
            >
              <PipelineLeadCard
                lead={currentLead}
                index={0}
                onReveal={(id, name, email, phone) => {
                  setLeads((prev) =>
                    prev.map((l) => (l.id === id ? { ...l, isRevealed: true, name, email, phone } : l)),
                  )
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Front Frosted Pocket Sleeve of the Gift Wrap */}
        <div className="relative w-full h-[110px] z-20 pointer-events-none">
          {/* Frosted Translucent Acrylic Pocket */}
          <div className="absolute inset-0 rounded-b-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-md border-t border-x border-white/[0.14] shadow-[0_14px_35px_rgba(0,0,0,0.7)] overflow-hidden">
            {/* V-neck collar contour */}
            <svg
              className="absolute top-0 left-0 right-0 w-full h-8 text-white/[0.06]"
              viewBox="0 0 360 32"
              fill="currentColor"
              preserveAspectRatio="none"
            >
              <polygon points="0,0 180,24 360,0 360,2 180,26 0,2" />
            </svg>
          </div>

          {/* Centered Seal Badge (Lead Delivery Icon) */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleNext}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 p-0.5 shadow-[0_4px_16px_rgba(249,115,22,0.4)] cursor-pointer flex items-center justify-center"
            >
              <div className="w-full h-full rounded-[10px] bg-[#161618] flex items-center justify-center text-orange-400">
                {/* Envelope Seal Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Subtext under the seal */}
          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-auto">
            <button
              type="button"
              onClick={handleNext}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Click seal or sleeve to unpack next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
