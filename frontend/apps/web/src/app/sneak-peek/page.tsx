'use client'

import AppSidebar from '@/components/layout/AppSidebar'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowRightIcon,
  BanknotesIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'

const ease = [0.16, 1, 0.3, 1] as const

const sneakPeekLeads = [
  {
    id: 1,
    initials: 'SK',
    name: 'Sarah K.',
    platform: 'Reddit',
    signal: 'Looking for a senior Shopify dev to rebuild our checkout flow. Budget $8-12k.',
    urgency: 'High',
    intent: 94,
    accent: 'mint',
  },
  {
    id: 2,
    initials: 'JT',
    name: 'James T.',
    platform: 'Twitter/X',
    signal:
      'Our conversion rate tanked after the redesign. Need someone who actually understands UX.',
    urgency: 'Critical',
    intent: 97,
    accent: 'pink',
  },
  {
    id: 3,
    initials: 'PM',
    name: 'Priya M.',
    platform: 'LinkedIn',
    signal:
      'Searching for a brand designer for our Series A rebrand. Want someone with SaaS experience.',
    urgency: 'Medium',
    intent: 82,
    accent: 'purple',
  },
  {
    id: 4,
    initials: 'DL',
    name: 'David L.',
    platform: 'Threads',
    signal: 'Website redesign needed ASAP for product launch in 3 weeks. React/Next preferred.',
    urgency: 'Critical',
    intent: 91,
    accent: 'cyan',
  },
  {
    id: 5,
    initials: 'MR',
    name: 'Maria R.',
    platform: 'Reddit',
    signal: 'Need a growth consultant who can help us crack B2B lead gen. Retainer basis.',
    urgency: 'High',
    intent: 88,
    accent: 'orange',
  },
  {
    id: 6,
    initials: 'AK',
    name: 'Alex K.',
    platform: 'Twitter/X',
    signal: 'DTC brand looking for email marketing expert. Our CAC is killing us.',
    urgency: 'High',
    intent: 90,
    accent: 'mint',
  },
]

export default function SneakPeekPage() {
  return (
    <div className="flex h-screen bg-bg-main overflow-hidden font-sans relative">
      <AppSidebar isSneakPeek={true} />

      <main className="flex-1 overflow-y-auto px-6 py-8 pb-32 relative scrollbar-hide">
        {/* Ambient Background Glows */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-purple-medium pointer-events-none" />
        <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] glow-mint-soft pointer-events-none" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          {/* Sneak Peek Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-8 p-4 rounded-2xl bg-accent-purple/5 border border-accent-purple/15 flex items-center justify-between gap-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                <EyeIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary">Sneak Peek Mode</span>
                <span className="text-xs text-text-secondary/60 ml-2">
                  — You&apos;re previewing the lead feed. Lead details are locked until you have
                  tokens.
                </span>
              </div>
            </div>
            <Link
              href="/#pricing"
              className="shrink-0 px-5 py-2 rounded-xl bg-accent-purple text-text-on-accent text-xs font-bold hover:bg-accent-purple/90 transition-all duration-300 flex items-center gap-2"
            >
              Get Tokens <BanknotesIcon className="w-[14px] h-[14px]" />
            </Link>
          </motion.div>

          {/* Header */}
          <div className="flex flex-col items-center justify-center mb-16 mt-4">
            <div className="w-full flex items-end justify-between">
              <div>
                <h1 className="text-[32px] font-bold text-text-primary tracking-tight mb-2 flex items-center gap-3">
                  Lead Feed
                  <div className="flex items-center gap-2 px-2.5 py-1 border-l-2 border-accent-mint bg-gradient-to-r from-accent-mint/10 to-transparent text-text-secondary hover:text-text-primary transition-colors text-11 font-bold tracking-super uppercase">
                    <span className="w-1.5 h-1.5 bg-accent-mint animate-pulse" />
                    {sneakPeekLeads.length} Signals
                  </div>
                </h1>
                <p className="text-text-secondary/80 text-sm">
                  Real-time conversational opportunities intercepted across your network.
                </p>
              </div>
            </div>
          </div>

          {/* Lead Feed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(340px,auto)]">
            {sneakPeekLeads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease }}
                className="group relative p-6 rounded-3xl bg-surface-secondary/50 border border-white/[0.04] hover:border-white/10 transition-all duration-500 flex flex-col overflow-hidden"
              >
                {/* Platform badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`px-2.5 py-1 rounded-lg bg-accent-${lead.accent}/10 border border-accent-${lead.accent}/20 text-accent-${lead.accent} text-9 font-bold uppercase tracking-widest`}
                  >
                    {lead.platform}
                  </div>
                  <div className="flex items-center gap-1.5 text-xxs text-text-secondary/40 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse shadow-[0_0_8px_currentColor]" />
                    Live
                  </div>
                </div>

                {/* Signal content - visible */}
                <p className="text-sm text-text-primary/90 leading-relaxed mb-5 flex-1 font-light">
                  &quot;{lead.signal}&quot;
                </p>

                {/* Intent bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xxs mb-1.5">
                    <span className="text-text-secondary/50 font-bold uppercase tracking-widest bg-accent-mint">
                      Intent Score
                    </span>
                    <span className={`font-bold text-accent-${lead.accent}`}>{lead.intent}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lead.intent}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1, ease }}
                      className={`h-full bg-accent-${lead.accent}/50 rounded-full`}
                    />
                  </div>
                </div>

                {/* Urgency */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xxs text-text-secondary/40 font-bold uppercase tracking-widest bg-accent-mint">
                    Urgency
                  </span>
                  <span
                    className={`text-xxs font-bold uppercase tracking-widest ${
                      lead.urgency === 'Critical'
                        ? 'text-text-secondary hover:text-text-primary transition-colors'
                        : lead.urgency === 'High'
                          ? 'text-text-secondary hover:text-text-primary transition-colors'
                          : 'text-text-secondary hover:text-text-primary transition-colors'
                    }`}
                  >
                    {lead.urgency}
                  </span>
                </div>

                {/* Locked identity section */}
                <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 overflow-hidden">
                  {/* Blurred content underneath */}
                  <div className="blur-[6px] select-none pointer-events-none">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-9 h-9 rounded-xl bg-accent-${lead.accent}/10 border border-accent-${lead.accent}/20 flex items-center justify-center`}
                      >
                        <span className={`text-xxs font-bold text-accent-${lead.accent}`}>
                          {lead.initials}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">{lead.name}</div>
                        <div className="text-xxs text-text-secondary/50">
                          Founder · E-commerce · $2M ARR
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-3 py-1.5 rounded-lg bg-surface-secondary text-9 font-bold text-text-secondary hover:text-text-primary transition-colors">
                        View Profile
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-surface-secondary text-9 font-bold text-text-secondary hover:text-text-primary transition-colors">
                        View Context
                      </div>
                    </div>
                  </div>

                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-2xl">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-2">
                      <LockClosedIcon className="w-[14px] h-[14px] text-text-secondary/50" />
                    </div>
                    <span className="text-xxs font-bold text-text-secondary/60 uppercase tracking-widest">
                      3 Tokens to Reveal
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease }}
            className="mt-16 p-10 rounded-4xl bg-gradient-to-b from-white/[0.02] to-transparent border border-white/[0.05] text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--rgb-tab-purple),0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative z-10">
              <SparklesIcon className="w-6 h-6 text-text-secondary mx-auto mb-4" />
              <h3 className="font-display text-2xl font-bold tracking-tight mb-3">
                Like What You See?
              </h3>
              <p className="text-sm text-text-secondary/70 font-light max-w-md mx-auto mb-6 leading-relaxed">
                These are real signals captured in the last 24 hours. Get tokens to reveal
                identities, save them to your pipeline, and start closing.
              </p>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-accent-purple text-text-on-accent font-bold text-sm hover:bg-accent-purple/90 transition-all duration-500"
              >
                Get Started <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
