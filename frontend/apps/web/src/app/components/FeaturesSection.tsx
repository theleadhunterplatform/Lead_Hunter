'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BoltIcon,
  AdjustmentsHorizontalIcon,
  PaperAirplaneIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  ViewfinderCircleIcon,
  SparklesIcon,
  EnvelopeIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'

const ease = [0.16, 1, 0.3, 1] as const

// ─── Card 1: Fresh Daily Leads — Live notification feed ──────────────────────
function FreshLeadsVisual({
  className = '',
  hoveredPlatform,
}: {
  className?: string
  hoveredPlatform: string | null
}) {
  const [hoveredNotif, setHoveredNotif] = React.useState<number | null>(null)
  const notifications = [
    {
      name: 'Sarah K.',
      signal: 'Looking for a Shopify developer',
      time: '2m ago',
      platform: 'Reddit',
      key: 'R',
    },
    {
      name: 'James T.',
      signal: 'Need help with conversion rates',
      time: '5m ago',
      platform: 'Twitter/X',
      key: 'X',
    },
    {
      name: 'Priya M.',
      signal: 'Searching for brand designer',
      time: '8m ago',
      platform: 'LinkedIn',
      key: 'Li',
    },
    {
      name: 'David L.',
      signal: 'Website redesign needed ASAP',
      time: '12m ago',
      platform: 'Threads',
      key: 'Th',
    },
  ]

  return (
    <div className={`w-full flex flex-col justify-center gap-3 ${className}`}>
      {notifications.map((notif, i) => {
        const isPlatformHighlighted = hoveredPlatform === notif.key
        const isSelfHovered = hoveredNotif === i
        return (
          <motion.div
            key={notif.name}
            onMouseEnter={() => setHoveredNotif(i)}
            onMouseLeave={() => setHoveredNotif(null)}
            className={`p-3 rounded-2xl bg-surface border transition-all duration-300 flex items-center gap-3 relative overflow-hidden ${
              isSelfHovered
                ? 'border-border-subtle bg-surface-secondary shadow-[0_12px_30px_rgba(var(--rgb-accent-purple),0.12)] -translate-y-0.5'
                : isPlatformHighlighted
                  ? 'border-border-subtle bg-surface shadow-[0_8px_20px_rgba(var(--rgb-accent-purple),0.1)] scale-102'
                  : 'border-white/[0.04] shadow-[0_12px_40px_-10px_rgba(var(--rgb-black),0.6)]'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-accent-purple">
                {notif.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-text-primary truncate">
                  {notif.name}
                </span>
                <span className="text-[9px] text-text-secondary/40 font-mono shrink-0">
                  {notif.time}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary/70 truncate">{notif.signal}</p>
            </div>
            <div
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0 transition-colors duration-300 ${
                isPlatformHighlighted
                  ? 'bg-accent-orange text-text-on-accent'
                  : 'bg-white/5 border border-white/[0.06] text-text-secondary/50'
              }`}
            >
              {notif.platform}
            </div>

            {/* Slide-in qualify indicator on hover */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: isSelfHovered ? 0 : '100%' }}
              transition={{ duration: 0.25, ease }}
              className="absolute inset-y-0 right-0 w-[75px] bg-accent-orange flex items-center justify-center cursor-pointer font-bold text-[8.5px] text-text-on-accent uppercase tracking-wider"
            >
              Qualify →
            </motion.div>
          </motion.div>
        )
      })}
      <div className="flex items-center gap-2 mt-1 ml-2">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
        <span className="text-[9px] text-accent-purple/60 font-bold uppercase tracking-widest">
          Live Feed
        </span>
      </div>
    </div>
  )
}

// ─── Card 2: Multi-Platform Sourcing — Orbiting platform network ────────────
function PlatformNetworkVisual({
  className = '',
  hoveredPlatform,
  onHoverPlatform,
}: {
  className?: string
  hoveredPlatform: string | null
  onHoverPlatform: (p: string | null) => void
}) {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const platforms = [
    {
      name: 'X',
      x: '50%',
      y: '15%',
      size: 36,
      delay: 0,
      tooltip: 'Scanning Twitter/X posts...',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'Li',
      x: '15%',
      y: '55%',
      size: 40,
      delay: 0.8,
      tooltip: 'Scanning LinkedIn feeds...',
      icon: (
        <svg className="w-4 h-4 fill-current text-social-linkedin" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
        </svg>
      ),
    },
    {
      name: 'R',
      x: '80%',
      y: '50%',
      size: 34,
      delay: 1.2,
      tooltip: 'Scanning Reddit threads...',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current text-social-reddit" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.203-.094z" />
        </svg>
      ),
    },
    {
      name: 'Th',
      x: '55%',
      y: '80%',
      size: 32,
      delay: 1.8,
      tooltip: 'Scanning Threads feeds...',
      icon: <span className="text-[10px] font-black text-white">@</span>,
    },
  ]

  return (
    <div className={`relative aspect-[200/160] w-full max-w-[220px] mx-auto ${className}`}>
      {/* Center hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center z-20">
        <AdjustmentsHorizontalIcon className="w-4 h-4 text-text-secondary animate-pulse" />
      </div>

      {/* Connection lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 200 160"
      >
        {[
          { x1: 100, y1: 80, x2: 100, y2: 24 },
          { x1: 100, y1: 80, x2: 30, y2: 88 },
          { x1: 100, y1: 80, x2: 160, y2: 80 },
          { x1: 100, y1: 80, x2: 110, y2: 128 },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(var(--rgb-accent-purple), 0.15)"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
          />
        ))}
      </svg>

      {/* Platform nodes */}
      {platforms.map((p) => {
        const isHovered = hoveredPlatform === p.name
        return (
          <div
            key={p.name}
            onMouseEnter={() => onHoverPlatform(p.name)}
            onMouseLeave={() => onHoverPlatform(null)}
            className="absolute z-20 cursor-help"
            style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              className={`rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_12px_40px_-10px_rgba(var(--rgb-black),0.6)] ${
                isHovered
                  ? 'border-accent-purple bg-surface-secondary scale-115 '
                  : 'bg-surface border-white/5'
              }`}
              style={{ width: p.size, height: p.size }}
              animate={{ scale: isHovered ? 1.15 : [0.95, 1.05, 0.95] }}
              transition={{
                duration: 3,
                repeat: isHovered ? 0 : Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            >
              {p.icon}
            </motion.div>

            {/* Custom Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute bottom-[115%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-surface border border-border-subtle text-[8px] text-text-secondary hover:text-text-primary transition-colors font-bold tracking-wide uppercase whitespace-nowrap z-30 shadow-[0_4px_12px_rgba(var(--rgb-black),0.5)]"
                >
                  {p.tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Data pulse traveling along lines */}
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-accent-purple z-30"
        animate={{
          x: [0, 30, -40, 10, 0],
          y: [0, -50, 10, 50, 0],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ left: '50%', top: '50%' }}
      />
    </div>
  )
}

// ─── Card 3: AI Outreach Writer — AI text generation (retained, no longer on the landing) ─
export function AIWriterVisual({
  className = '',
  selectedStep,
}: {
  className?: string
  selectedStep: number
}) {
  const copies = [
    {
      title: 'Day 1: Personal Value Hook',
      text: "Hey Sarah, noticed you're scaling your Shopify store. We just helped a similar DTC brand cut CAC by 30% and optimize checkout conversion rates...",
      rate: '96% Reply',
      badge: 'Spam Safe',
    },
    {
      title: 'Day 3: Case Study & Proof',
      text: 'Hi Sarah, just wanted to share a quick metric: our DTC partner added $42k in ARR within 30 days of redesigning their product pages...',
      rate: '89% Reply',
      badge: 'Social Proof',
    },
    {
      title: 'Day 5: Direct & Soft Ask',
      text: 'Hey Sarah, hoping to connect. Are you open to a brief 10-minute audit of your current checkout flow next Tuesday? Happy to share 3 quick wins...',
      rate: '74% Reply',
      badge: 'Urgent Close',
    },
    {
      title: 'Day 7: Final Breakup Nudge',
      text: "Sarah - final nudge here. If conversion redesign isn't a priority right now, completely understand! I'll check back next quarter.",
      rate: '62% Reply',
      badge: 'Breakup Copy',
    },
  ]

  const current = copies[selectedStep] || copies[0]

  return (
    <div
      className={`relative h-[220px] w-full p-4 rounded-2xl bg-surface border border-white/[0.04] shadow-[0_12px_40px_-10px_rgba(var(--rgb-black),0.6)] overflow-hidden flex flex-col justify-between hover:border-border-subtle transition-all duration-500 ${className} hover:border-accent-purple/20`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 glow-purple-intense pointer-events-none" />

      <div className="relative z-10 font-mono text-[11px] leading-relaxed flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent-purple font-bold mb-3 uppercase tracking-wider text-[9px]">
            <SparklesIcon className="w-[11px] h-[11px] animate-[spin_4s_linear_infinite]" /> AI
            Compose: {current.title}
          </div>

          <motion.div
            key={selectedStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-text-primary text-[10.5px] leading-relaxed"
          >
            {current.text}
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-accent-purple animate-pulse align-middle" />
          </motion.div>
        </div>

        {/* Score badges */}
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20 text-[8px] font-bold text-accent-purple uppercase tracking-widest">
            {current.rate}
          </span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-text-secondary uppercase tracking-widest">
            {current.badge}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Card 4: Lead Intelligence — Animated HUD gauges ────────────────
function LeadIntelVisual({
  className = '',
  emailStatus,
}: {
  className?: string
  emailStatus: 'idle' | 'sending' | 'sent'
}) {
  const [hoveredMetric, setHoveredMetric] = React.useState<number | null>(null)

  const metrics = [
    {
      label: 'Intent Score',
      value: emailStatus === 'sent' ? '98%' : '94%',
      width: emailStatus === 'sent' ? '98%' : '94%',
      color: 'bg-accent-purple/50',
      tip: 'Buyer actively looking for Shopify optimization experts.',
    },
    {
      label: 'Budget Signal',
      value: 'High',
      width: '82%',
      color: 'bg-accent-purple/50',
      tip: 'E-commerce brand doing $2M ARR with high Shopify Plus budget.',
    },
    {
      label: 'Urgency Level',
      value: emailStatus === 'sent' ? 'Handled' : 'Critical',
      width: emailStatus === 'sent' ? '100%' : '97%',
      color: 'bg-accent-purple/50',
      tip: 'Checkout cart errors causing direct conversion loss.',
    },
  ]

  return (
    <div className={`w-full flex flex-col justify-center gap-3.5 ${className}`}>
      {/* Lead profile card */}
      <div className="metallic-card p-4 transition-all duration-500 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-accent-purple bg-accent-purple/10 border-accent-purple/20">
              AK
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[9px] font-bold tracking-wider uppercase mb-0.5">
              <span className="w-1 h-1 bg-accent-purple rounded-full animate-pulse" />
              15 Signals
            </span>
            <div className="text-[11px] font-bold text-text-primary truncate">Alex K.</div>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0 transition-colors duration-300 ${
              emailStatus === 'sent'
                ? 'bg-accent-orange text-text-on-accent'
                : 'bg-surface-secondary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors'
            }`}
          >
            {emailStatus === 'sent' ? 'Contacted' : 'Verified'}
          </div>
        </div>

        {/* Metric bars */}
        <div className="space-y-2">
          {metrics.map((m, i) => {
            const isHovered = hoveredMetric === i
            return (
              <div
                key={m.label}
                onMouseEnter={() => setHoveredMetric(i)}
                onMouseLeave={() => setHoveredMetric(null)}
                className="relative cursor-help py-0.5 rounded hover:bg-white/[0.02] px-1 -mx-1 transition-colors"
              >
                <div className="flex justify-between text-[9.5px] mb-0.5">
                  <span className="text-text-secondary/60">{m.label}</span>
                  <span className="text-text-primary font-semibold">{m.value}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '10%' }}
                    animate={{ width: m.width }}
                    transition={{ duration: 1.2, delay: 0.1 + i * 0.1, ease }}
                    className={`h-full ${m.color} rounded-full`}
                  />
                </div>

                {/* Micro Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute z-30 bottom-[110%] left-0 w-full p-2 rounded-lg bg-surface-secondary border border-white/5 text-[8.5px] text-text-secondary shadow-lg leading-snug"
                    >
                      {m.tip}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI context insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="p-3 rounded-xl bg-surface-secondary border border-border-subtle shadow-md"
      >
        <div className="text-[9px] text-accent-purple font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <GlobeAltIcon className="w-[10px] h-[10px]" /> AI Context
        </div>
        <p className="text-[10px] text-text-secondary/70 leading-snug">
          {emailStatus === 'sent'
            ? '"Lead revealed — verified email and phone unlocked. Saved to your pipeline."'
            : '"Posted about high Shopify acquisition costs on Twitter 2h ago. Actively seeking conversion assistance."'}
        </p>
      </motion.div>
    </div>
  )
}

// ─── Card 5: Revealed Contact — Save to pipeline mockup ─────────────
function EmailComposeVisual({
  className = '',
  emailStatus,
  onSend,
}: {
  className?: string
  emailStatus: 'idle' | 'sending' | 'sent'
  onSend: () => void
}) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div
        className={`w-full rounded-2xl bg-surface border transition-all duration-500 flex flex-col h-[230px] justify-between ${
          emailStatus === 'sent'
            ? 'border-border-subtle shadow-[0_12px_30px_rgba(var(--rgb-accent-purple),0.05)]'
            : 'border-white/[0.04]'
        }`}
      >
        {/* Card header bar */}
        <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-3 text-accent-purple">
          <div className="flex items-center gap-1 shrink-0 text-accent-purple">
            <div className="w-1.5 h-1.5 rounded-full bg-dot-red opacity-60 text-accent-purple" />
            <div className="w-1.5 h-1.5 rounded-full bg-dot-yellow opacity-60 text-accent-purple" />
            <div className="w-1.5 h-1.5 rounded-full bg-dot-green opacity-60 text-accent-purple" />
          </div>
          <span className="text-[9.5px] text-text-secondary/40 font-mono">Contact Revealed</span>
          <div className="ml-auto flex items-center gap-1.5 text-accent-purple">
            <span className="text-text-secondary hover:text-text-primary transition-colors text-[8.5px] font-bold tracking-widest uppercase">
              Verified
            </span>
          </div>
        </div>

        {/* Contact fields */}
        <div className="px-4 py-1.5 border-b border-white/[0.03]">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-text-secondary/40 font-medium w-8 shrink-0">Email:</span>
            <span className="text-text-secondary hover:text-text-primary transition-colors truncate">
              alex.k@shopifybrand.com
            </span>
          </div>
        </div>
        <div className="px-4 py-1.5 border-b border-white/[0.03]">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-text-secondary/40 font-medium w-8 shrink-0">Phone:</span>
            <span className="text-text-primary/80 truncate">
              +1 (555) 012-3456
            </span>
          </div>
        </div>

        {/* Intel body */}
        <div className="flex-1 px-4 py-2.5 text-[9.5px] text-text-primary/80 leading-relaxed overflow-hidden relative">
          {emailStatus === 'sent' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center gap-2"
            >
              <span className="w-8 h-8 rounded-full bg-surface-secondary border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                ✓
              </span>
              <span className="text-[10px] text-text-primary font-bold">
                Saved to Pipeline!
              </span>
              <span className="text-[8px] text-text-secondary/60">
                Export anytime as CSV or Excel.
              </span>
            </motion.div>
          ) : (
            <>
              High buyer intent detected — posted about rising Shopify acquisition costs 2h ago.
              Email and phone unlocked. Ready to save and reach out on your own terms.
              <span className="inline-block w-1 h-3 ml-0.5 bg-accent-purple animate-pulse align-middle" />
            </>
          )}
        </div>

        {/* Save bar */}
        <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-3 h-3 text-text-secondary/30" />
            <span className="text-[8.5px] text-text-secondary/30 font-mono">
              {emailStatus === 'sending' ? 'Saving...' : emailStatus === 'sent' ? 'Saved' : 'New'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSend()
            }}
            disabled={emailStatus !== 'idle'}
            className={`px-2.5 py-1 rounded text-[8.5px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all duration-300 scale-100 ${
              emailStatus === 'sending'
                ? 'bg-white/10 text-white/40 cursor-wait'
                : emailStatus === 'sent'
                  ? 'bg-accent-orange text-text-on-accent cursor-default'
                  : 'bg-accent-purple hover:bg-surface-secondary text-text-on-accent cursor-pointer hover:scale-105 shadow-[0_4px_12px_rgba(var(--rgb-accent-purple),0.15)]'
            }`}
          >
            {emailStatus === 'sending' ? (
              <span className="w-2.5 h-2.5 rounded-full border border-t-transparent border-white animate-spin" />
            ) : emailStatus === 'sent' ? (
              'Saved ✓'
            ) : (
              <>
                <PaperAirplaneIcon className="w-[9px] h-[9px]" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card 6: Pipeline Tracking — Vertical timeline ───────────────────────
function FollowUpTimelineVisual({
  className = '',
  selectedStep,
  onSelectStep,
}: {
  className?: string
  selectedStep: number
  onSelectStep: (idx: number) => void
}) {
  const steps = [
    { day: 'Revealed', action: 'Contact Unlocked', status: 'sent' },
    { day: 'Saved', action: 'Added to Pipeline', status: 'sent' },
    { day: 'Contacted', action: 'Reached Out', status: 'pending' },
    { day: 'Replied', action: 'Conversation Open', status: 'scheduled' },
  ]

  return (
    <div className={`relative h-[220px] w-full flex flex-col justify-center ${className}`}>
      {/* Vertical connecting line */}
      <div className="absolute left-[14px] top-[14px] bottom-[14px] w-px bg-white/[0.06] overflow-hidden">
        <motion.div
          className="w-full h-1/3 bg-gradient-to-b from-transparent via-accent-purple to-transparent"
          animate={{ y: ['-100%', '300%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="space-y-2.5 relative z-10">
        {steps.map((step, i) => {
          const isSelected = selectedStep === i
          return (
            <div
              key={step.day}
              onClick={(e) => {
                e.stopPropagation()
                onSelectStep(i)
              }}
              className="flex items-center gap-3 pl-0.5 cursor-pointer relative bg-gradient-to-b via-accent-purple"
            >
              <div
                className={`w-[8px] h-[8px] rounded-full border shrink-0 flex items-center justify-center transition-all duration-500 ${
                  isSelected
                    ? 'border-accent-purple bg-surface-secondary scale-125 '
                    : step.status === 'sent'
                      ? 'border-accent-purple bg-surface-secondary '
                      : step.status === 'pending'
                        ? 'border-border-subtle bg-surface-secondary'
                        : 'border-white/10 bg-white/5'
                }`}
              >
                {step.status === 'sent' && <div className="w-1 h-1 rounded-full bg-accent-purple" />}
              </div>
              <div
                className={`flex-1 p-2 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? 'border-accent-purple bg-surface-secondary shadow-[0_8px_20px_rgba(var(--rgb-accent-purple),0.08)] scale-102'
                    : 'border-white/[0.04] bg-surface hover:bg-surface-secondary hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-text-primary uppercase tracking-wider">
                    {step.day}
                  </span>
                  <span
                    className={`text-[8px] font-bold uppercase tracking-widest ${
                      step.status === 'sent'
                        ? 'text-text-secondary hover:text-text-primary transition-colors'
                        : step.status === 'pending'
                          ? 'text-text-secondary hover:text-text-primary transition-colors'
                          : 'text-text-secondary/40'
                    }`}
                  >
                    {step.action}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Card 7: Token-Based Usage — Token meter animation ──────────────────────
function TokenMeterVisual({
  className = '',
  selectedPersona,
}: {
  className?: string
  selectedPersona: string | null
}) {
  const getValues = () => {
    switch (selectedPersona) {
      case 'free':
        return { count: 50, offset: 0.05, label: 'Reveal: 3', label2: 'Email: 2' }
      case 'freelancer':
        return { count: 500, offset: 0.02, label: 'Reveal: 3', label2: 'Email: 2' }
      case 'agency':
        return { count: 1000, offset: 0.01, label: 'Reveal: 3', label2: 'Email: 2' }
      default:
        return { count: 50, offset: 0.05, label: 'Reveal: 3', label2: 'Email: 2' }
    }
  }

  const current = getValues()

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Circular meter */}
      <div className="relative w-[110px] h-[110px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(var(--rgb-white),0.04)"
            strokeWidth="6"
          />
          <motion.circle
            key={selectedPersona || 'default'}
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#tokenGradientRow)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 50}
            initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 50 * current.offset }}
            transition={{ duration: 1, ease }}
          />
          <defs>
            <linearGradient id="tokenGradientRow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent-purple)" />
              <stop offset="100%" stopColor="var(--color-tab-purple)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={current.count}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xl font-bold text-text-primary"
          >
            {current.count}
          </motion.span>
          <span className="text-[8px] text-text-secondary/50 font-bold uppercase tracking-widest">
            credits
          </span>
        </div>
      </div>

      {/* Token breakdown pills */}
      <div className="flex items-center gap-2 mt-3.5">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <BanknotesIcon className="w-[9px] h-[9px] text-text-secondary" />
          <span className="text-[7.5px] font-bold text-text-secondary/60 uppercase tracking-widest">
            {current.label}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <BanknotesIcon className="w-[9px] h-[9px] text-text-secondary" />
          <span className="text-[7.5px] font-bold text-text-secondary/60 uppercase tracking-widest">
            {current.label2}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Card 8: Built For Freelancers — Persona cards ───────────────────
function PersonaCardsVisual({
  className = '',
  selectedPersona,
  onSelectPersona,
}: {
  className?: string
  selectedPersona: string | null
  onSelectPersona: (p: string | null) => void
}) {
  const personas = [
    {
      id: 'free',
      role: 'Free',
      icon: CodeBracketIcon,
      accent: 'accent-purple',
      desc: '50 credits — get started today',
    },
    {
      id: 'freelancer',
      role: 'Freelancer',
      icon: PaintBrushIcon,
      accent: 'accent-purple',
      desc: '500 credits — build your pipeline',
    },
    {
      id: 'agency',
      role: 'Agency',
      icon: ChartBarIcon,
      accent: 'accent-purple',
      desc: '1,000 credits — scale operations',
    },
  ]

  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {personas.map((p, i) => {
          const Icon = p.icon
          const isSelected = selectedPersona === p.id
          return (
            <motion.div
              key={p.role}
              onMouseEnter={() => onSelectPersona(p.id)}
              onMouseLeave={() => onSelectPersona(null)}
              className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center cursor-pointer ${
                isSelected
                  ? `border-${p.accent}/40 bg-code-bg/90 scale-104 shadow-[0_8px_20px_rgba(var(--rgb-white),0.02)]`
                  : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition-colors duration-300 ${
                  isSelected
                    ? `bg-${p.accent}/20 text-${p.accent}`
                    : `bg-${p.accent}/10 text-${p.accent}`
                }`}
              >
                <Icon className="w-[15px] h-[15px]" />
              </div>
              <h5 className="text-[10px] font-bold text-text-primary tracking-tight mb-1">
                {p.role}
              </h5>
              <p className="text-[8.5px] text-text-secondary/60 leading-snug mb-1">{p.desc}</p>
              <span
                className={`inline-flex items-center gap-1 text-${p.accent} text-[7px] font-bold uppercase tracking-widest mt-auto`}
              >
                {isSelected ? 'Selected' : 'Active'}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN SECTION ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function FeaturesSection() {
  // Stateful hooks for visual rows
  const [hoveredPlatform, setHoveredPlatform] = React.useState<string | null>(null)

  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle')
  const handleSendEmail = () => {
    if (emailStatus !== 'idle') return
    setEmailStatus('sending')
    setTimeout(() => {
      setEmailStatus('sent')
    }, 1500)
  }

  const [selectedStep, setSelectedStep] = React.useState<number>(0)
  const [selectedPersona, setSelectedPersona] = React.useState<string | null>(null)

  return (
    <section
      id="features"
      className="py-40 px-6 max-w-[1200px] mx-auto relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* Ambient backdrop glows */}
      <div className="absolute top-[-5%] left-1/4 w-[500px] h-[500px] glow-purple-very-faint pointer-events-none" />
      <div className="absolute bottom-[5%] right-1/4 w-[500px] h-[500px] glow-purple-very-faint pointer-events-none" />

      {/* Headline */}
      <div className="text-center mb-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-[10px] font-bold tracking-ultra uppercase mb-6 block text-accent-purple">
            Product Capabilities
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="font-display text-[42px] md:text-[56px] font-semibold tracking-tight mb-6 leading-[1.1] max-w-4xl mx-auto"
        >
          Everything You Need.
          <br />
          <span className="text-text-secondary/70">Nothing You Don&apos;t.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="text-lg md:text-xl text-text-secondary font-light max-w-2xl mx-auto leading-relaxed"
        >
          A complete, unified acquisition stack designed to qualify, analyze, and convert high-value
          clients effortlessly.
        </motion.p>
      </div>

      {/* ═══ ALTERNATING FULL-WIDTH ROWS ═══ */}
      <div className="space-y-24 md:space-y-36 relative z-10">
        {/* ── ROW 1: Fresh Daily Leads + Multi-Platform Sourcing (Text Left / Visual Right) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center"
        >
          {/* Copy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
                Real-time acquisition
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Fresh Daily Leads from Multiple Platforms
              </h3>
            </div>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Opportunities surface in real-time from obscure forums, social networks, and intent
              sites. Monitor high-intent queries across LinkedIn, Reddit, Twitter/X, and Threads the
              exact second they ask for help.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                {
                  title: 'Unified Social Inbox',
                  desc: 'No more tab switching. All platform streams parsed into one dashboard.',
                },
                {
                  title: 'High-Intent Filtering',
                  desc: 'AI-trained algorithms separate casual talk from buyers ready to hire.',
                },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start">
                  <span className="w-1.5 h-1.5 bg-accent-purple rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wide leading-none mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Combined Visuals */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.4, ease }}
            className="lg:col-span-7 w-full group relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center metallic-card p-6 md:p-8 min-h-[340px] cursor-pointer transition-colors duration-500"
          >
            {/* Orb Glow */}
            <div className="absolute top-0 left-0 w-40 h-40 glow-purple-strong pointer-events-none" />
            <PlatformNetworkVisual
              className="max-w-[200px]"
              hoveredPlatform={hoveredPlatform}
              onHoverPlatform={setHoveredPlatform}
            />
            <FreshLeadsVisual hoveredPlatform={hoveredPlatform} />
          </motion.div>
        </motion.div>

        {/* ── ROW 2: Lead Intelligence + Email Integration (Visual Left / Text Right) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center"
        >
          {/* Copy (Desktop right) */}
          <div className="lg:col-span-5 space-y-6 lg:order-last">
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
                Lead Enrichment
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Lead Intelligence with Revealed Contacts
              </h3>
            </div>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Analyze and enrich prospect profiles instantly to understand exactly who you are
              speaking to. See urgency levels, budget cues, and comprehensive buyer context with
              verified contact details ready to act on.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                {
                  title: 'Intent & Urgency Scoring',
                  desc: 'See clear qualifying signals like budget and context analyzed dynamically.',
                },
                {
                  title: 'Verified Contact Data',
                  desc: 'Email and phone unlocked the moment you reveal a lead.',
                },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start">
                  <span className="w-1.5 h-1.5 bg-accent-purple rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wide leading-none mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Combined Visuals (Desktop left) */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.4, ease }}
            className="lg:col-span-7 w-full lg:order-first group relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center metallic-card p-6 md:p-8 min-h-[340px] cursor-pointer transition-colors duration-500"
          >
            {/* Orb Glow */}
            <div className="absolute bottom-0 right-0 w-40 h-40 glow-purple-strong pointer-events-none" />
            <LeadIntelVisual emailStatus={emailStatus} />
            <EmailComposeVisual emailStatus={emailStatus} onSend={handleSendEmail} />
          </motion.div>
        </motion.div>

        {/* ── ROW 3: Automated Follow-Ups (Text Left / Visual Right) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center"
        >
          {/* Copy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
                Pipeline momentum
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Track Every Touch
              </h3>
            </div>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Keep your pipeline moving by logging every interaction. Reveal a lead, save it, mark
              when you reach out — and see where each conversation stands at a glance.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                {
                  title: 'Stage Tracking',
                  desc: 'Move leads from Revealed to Contacted to Replied as you close in.',
                },
                {
                  title: 'Reply Flags',
                  desc: 'Mark when a prospect replies so nothing slips through the cracks.',
                },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start">
                  <span className="w-1.5 h-1.5 bg-accent-purple rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wide leading-none mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.4, ease }}
            className="lg:col-span-7 w-full group relative grid grid-cols-1 gap-6 items-center metallic-card p-6 md:p-8 min-h-[340px] cursor-pointer transition-colors duration-500"
          >
            {/* Orb Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 glow-purple-strong pointer-events-none" />
            <FollowUpTimelineVisual selectedStep={selectedStep} onSelectStep={setSelectedStep} />
          </motion.div>
        </motion.div>

        {/* ── ROW 4: Token-Based Usage + Freelancers & Agencies (Visual Left / Text Right) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center"
        >
          {/* Copy (Desktop right) */}
          <div className="lg:col-span-5 space-y-6 lg:order-last">
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
                Credit-Based Usage
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Credits Based, Not Seat Based
              </h3>
            </div>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Pay only for the specific actions you perform. Solo builders, growth consultancies,
              and digital agencies can scale usage smoothly without complex monthly seat commitments
              or locked features.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                {
                  title: 'Zero Flat Commitments',
                  desc: 'Spend credits specifically on what gives you direct client value.',
                },
                {
                  title: 'Built for Every Scale',
                  desc: 'From solo operators to full agencies — pick the credit plan that fits.',
                },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start">
                  <span className="w-1.5 h-1.5 bg-accent-purple rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wide leading-none mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Combined Visuals (Desktop left) */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.4, ease }}
            className="lg:col-span-7 w-full lg:order-first group relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center metallic-card p-6 md:p-8 min-h-[340px] cursor-pointer transition-colors duration-500"
          >
            {/* Orb Glow */}
            <div className="absolute bottom-0 left-0 w-40 h-40 glow-purple-strong pointer-events-none" />
            <div className="lg:col-span-5 flex justify-center w-full group-hover:-translate-y-1 transition-transform duration-500">
              <TokenMeterVisual selectedPersona={selectedPersona} />
            </div>
            <div className="lg:col-span-7 w-full group-hover:-translate-y-1 transition-transform duration-500">
              <PersonaCardsVisual
                selectedPersona={selectedPersona}
                onSelectPersona={setSelectedPersona}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
