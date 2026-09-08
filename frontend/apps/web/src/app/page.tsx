'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  GlobeAltIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import HeroSection from '@/app/components/HeroSection'
import TokenSystemSection from '@/app/components/TokenSystemSection'
import WhoItsForGrid from '@/app/components/WhoItsForGrid'
import FeaturesSection from '@/app/components/FeaturesSection'
import TestimonialsSection from '@/app/components/TestimonialsSection'
import { NewsletterSignup } from '@/app/components/NewsletterSignup'
import { SignalInterceptStage } from '@/app/components/SignalInterceptStage'
import { LeadGiftWrapStage } from '@/app/components/LeadGiftWrapStage'
import { LeadOutreachFlowchart } from '@/app/components/LeadOutreachFlowchart'
const ease = [0.16, 1, 0.3, 1] as const

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.03] py-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <h4 className="font-display text-xl text-text-primary group-hover:text-accent-orange transition-colors duration-300">
          {q}
        </h4>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.4, ease }}>
          <ChevronDownIcon className="w-[22px] h-[22px] text-text-secondary" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden"
          >
            <p className="pt-5 text-text-secondary text-lg leading-relaxed max-w-3xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-main text-text-primary font-sans overflow-x-hidden max-w-[1100px] mx-auto px-4 sm:px-6">
      <HeroSection />

      {/* Precision Beam Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Problem & How It Works (Bento Grid) */}
      <section id="funnel" className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative">
        <div className="text-center mb-10 md:mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="text-sm font-semibold text-accent-orange mb-3 block">
              How it works
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight mb-3 leading-[1.15] max-w-2xl mx-auto"
          >
            From Raw Signal
            <br />
            <span className="text-text-secondary/70">To Closed Client.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-sm sm:text-base text-text-secondary font-light max-w-xl mx-auto leading-relaxed"
          >
            Here&apos;s exactly how Lead Hunter Club turns unindexed buyer signals into high-value
            client conversations before competitors even know they exist.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* CARD 1: Fresh Buyer Intent (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, ease }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 group relative p-6 md:p-8 metallic-card transition-all duration-500 flex flex-col justify-center"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
              {/* Left Column: Clean Context */}
              <div className="md:col-span-5 flex flex-col justify-center pr-0 md:pr-2">
                <span className="text-xs font-semibold text-accent-orange block mb-2">
                  Step 01
                </span>

                <h3 className="font-display text-xl md:text-2xl font-semibold mb-3 tracking-tight text-white leading-snug">
                  We Intercept Fresh Signals
                </h3>

                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                  Our engine continuously scans niche communities, social feeds, and intent networks to capture the exact moment someone asks for help with a service you offer. These are real people, posting right now.
                </p>
              </div>

              {/* Right Column: Live Signal Stage */}
              <div className="md:col-span-7 w-full">
                <SignalInterceptStage />
              </div>
            </div>
          </motion.div>

          {/* CARD 2: Qualified Leads (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            whileHover={{ y: -4 }}
            className="group relative p-6 md:p-8 metallic-card transition-all duration-500 min-h-[280px] md:min-h-[300px] flex flex-col justify-between shadow-[0_0_15px_rgba(var(--rgb-white),0.15)]"
          >
            {/* AI Filter Funnel Visual */}
            <div className="relative h-[140px] mb-4">
              {/* Incoming signals (top - raw/unfiltered) */}
              <div className="space-y-2 mb-3">
                {[
                  { label: 'Reddit: Need logo designer', status: 'pass' },
                  { label: 'Spam bot: Buy followers now', status: 'reject' },
                  { label: 'LinkedIn: Looking for dev agency', status: 'pass' },
                  { label: 'Old post: Closed 3 months ago', status: 'reject' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] transition-all duration-500 ${
                      item.status === 'pass'
                        ? 'bg-surface-secondary border border-border-subtle group-hover:border-border-subtle group-hover:bg-surface-secondary'
                        : 'bg-white/[0.01] border border-white/[0.04] group-hover:opacity-30 group-hover:line-through'
                    }`}
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-black transition-all duration-500 ${
                        item.status === 'pass'
                          ? 'bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors group-hover:bg-surface-secondary'
                          : 'bg-white/5 text-text-secondary/30 group-hover:bg-red-500/20 group-hover:text-red-400'
                      }`}
                    >
                      {item.status === 'pass' ? '✓' : '✕'}
                    </div>
                    <span
                      className={`truncate ${
                        item.status === 'pass'
                          ? 'text-text-primary font-medium'
                          : 'text-text-secondary/50'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors uppercase tracking-widest mb-2 block">
                Step 02
              </span>
              <h3 className="font-display text-lg md:text-xl font-semibold mb-2.5 tracking-tight">
                AI Filters Out the Noise
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                Not every signal is worth your time. Our AI automatically filters dead leads, spam,
                low-intent posts, and irrelevant requests: only genuine, high-probability
                opportunities make it through.
              </p>
            </div>
          </motion.div>

          {/* CARD 3: Lead Intelligence Builder (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, ease }}
            whileHover={{ y: -4 }}
            className="group relative p-6 md:p-8 metallic-card transition-all duration-500 min-h-[280px] md:min-h-[300px] flex flex-col justify-between"
          >
            {/* Intelligence Dossier Builder */}
            <div className="relative h-[140px] mb-4 p-4 rounded-2xl bg-canvas-deeper/60 border border-white/[0.03] shadow-[inset_0_2px_8px_rgba(var(--rgb-black),0.8)] overflow-hidden group-hover:border-border-subtle transition-colors duration-500 group-hover:border-accent-purple/15">
              <div className="relative z-10 h-full flex flex-col group-hover:border-accent-purple/15">
                <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-bold text-[10px] uppercase tracking-widest mb-3 group-hover:border-accent-purple/15">
                  <GlobeAltIcon className="w-3 h-3" /> Compiling Intel...
                </div>

                {/* Data fields building up */}
                <div className="space-y-2 flex-1 group-hover:border-accent-purple/15">
                  {[
                    { field: 'Pain Point', value: 'High CAC on Shopify store', delay: 0 },
                    { field: 'Budget', value: '$5k-$10k range', delay: 80 },
                    { field: 'Urgency', value: 'Critical (Q2 deadline)', delay: 160 },
                    { field: 'Context', value: 'Posted on Twitter 2h ago', delay: 240 },
                  ].map((item) => (
                    <div
                      key={item.field}
                      className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-all duration-500"
                      style={{ transitionDelay: `${item.delay}ms` }}
                    >
                      <span className="text-[9px] text-text-secondary/50 font-bold uppercase tracking-widest w-[70px] shrink-0">
                        {item.field}
                      </span>
                      <span className="text-[10px] text-text-primary font-medium truncate">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Score reveal */}
                <div
                  className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ transitionDelay: '350ms' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  <span className="text-[9px] text-accent-purple font-bold uppercase tracking-widest">
                    Intent Score: 94%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-accent-purple uppercase tracking-widest mb-2 block">
                Step 03
              </span>
              <h3 className="font-display text-lg md:text-xl font-semibold mb-2.5 tracking-tight">
                We Build Lead Intelligence
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                Every surviving lead gets deep-analyzed. We compile buyer context, company details,
                urgency level, budget indicators, and the exact pain point they expressed, giving
                you a complete intelligence brief before you even reach out.
              </p>
            </div>
          </motion.div>

          {/* CARD 4: Released to the Hunters (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 group relative p-6 md:p-8 metallic-card transition-all duration-500 flex flex-col justify-center"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
              {/* Left Column: Context & Copy */}
              <div className="md:col-span-5 flex flex-col justify-center pr-0 md:pr-2">
                <span className="text-xs font-semibold text-accent-orange block mb-2">
                  Step 04
                </span>

                <h3 className="font-display text-xl md:text-2xl font-semibold mb-3 tracking-tight text-white leading-snug">
                  Released to the Hunters
                </h3>

                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
                  Qualified, intelligence-loaded leads land directly in your dashboard, packaged and ready to act on. Reach warm buyers with complete context while the opportunity is fresh.
                </p>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-400 font-mono w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span>Click sleeve to unpack fresh leads</span>
                </div>
              </div>

              {/* Right Column: Lead Gift Wrap Stage */}
              <div className="md:col-span-7 w-full flex items-center justify-center">
                <LeadGiftWrapStage />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Conversational Intelligence Section */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <section
        id="philosophy"
        className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative"
      >
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-14 relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="text-sm font-semibold text-accent-orange mb-3 block">
              Why Lead Hunter Club
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight mb-4 leading-[1.15] text-text-primary"
          >
            Most lead tools chase volume.
            <br />
            <span className="text-text-secondary/70 font-light">We deliver intent.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-sm sm:text-base text-text-secondary font-light leading-relaxed max-w-2xl mx-auto"
          >
            Anyone can scrape thousands of raw contacts. But without buyer context, cold messages get ignored.
            Lead Hunter Club turns fresh intent signals into rich dossiers that feed your choice of AI, crafting surgical outreach that lands in primary inboxes and drives real replies.
          </motion.p>
        </div>

        {/* The Noise vs The Signal: Compact Parallel Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25, ease }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[900px] mx-auto mb-10"
        >
          {/* The Noise */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary/50 font-bold">
                The Noise: Bulk Scraping
              </span>
              <span className="text-[10px] font-mono text-red-400/80 bg-red-500/10 px-2 py-0.5 rounded">
                ~1.2% Reply Rate
              </span>
            </div>
            <ul className="space-y-2">
              {[
                'Robotic, dry templates blast unverified contacts',
                'Copy-pasted pitches lacking specific pain points',
                'Aggressive follow-ups that land directly in spam',
              ].map((item) => (
                <li key={item} className="text-xs text-text-secondary/50 flex items-center gap-2.5">
                  <span className="w-1 h-1 rounded-full bg-red-400/40 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The Signal */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-primary/25 shadow-[0_0_25px_rgba(255,184,0,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                The Signal: Lead Hunter Club
              </span>
              <span className="text-[10px] font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20 font-medium">
                ~38% Reply Rate
              </span>
            </div>
            <ul className="space-y-2">
              {[
                'Intercepts verified buyers asking for help right now',
                'Compiles deep tech stack, budget, and pain point dossier',
                'Routes context to your AI to write surgical human outreach',
              ].map((item) => (
                <li key={item} className="text-xs text-text-primary flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Live Interactive Flowchart Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="w-full max-w-[960px] mx-auto"
        >
          <LeadOutreachFlowchart />
        </motion.div>
      </section>
      {/* Testimonials */}
      <TestimonialsSection />

      {/* Product Capabilities */}
      <FeaturesSection />

      {/* Token System */}
      <TokenSystemSection />

      {/* Who It's For */}
      <WhoItsForGrid />


      {/* Pricing */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <section
        id="pricing"
        className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative overflow-hidden"
      >
        {/* Header */}
        <div className="text-center mb-12 md:mb-14 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="text-sm font-semibold text-accent-orange mb-3 block">
              Pricing
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-display text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-tight mb-4 leading-[1.15]"
          >
            Acquisition Fuel.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-sm sm:text-base text-text-secondary font-light max-w-xl mx-auto leading-relaxed"
          >
            Start free, upgrade when you&apos;re ready. Credits reveal lead identities so you can build
            your pipeline.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 relative z-10">
          {[
            {
              name: 'Free',
              tokens: '50',
              price: 'Free',
              desc: 'Experience the platform and start closing your first high-value client.',
              accent: 'purple',
              featured: false,
              features: [
                '50 Intelligence Credits',
                '~16 Lead Reveals',
                'Basic Lead Intelligence',
              ],
            },
            {
              name: 'Freelancer',
              tokens: '500',
              price: 'Free',
              desc: 'For serious operators building a consistent, high-quality client pipeline.',
              accent: 'purple',
              featured: true,
              features: [
                '500 Intelligence Credits',
                '~166 Lead Reveals',
                'Full Lead Intelligence',
                'CSV/Excel Exports',
                'Priority Signal Access',
                'Credit Rollover',
              ],
            },
            {
              name: 'Agency',
              tokens: '1,000',
              price: 'Free',
              desc: 'Scale teams requiring massive deal flow and deep market intelligence.',
              accent: 'purple',
              featured: false,
              features: [
                '1,000 Intelligence Credits',
                '~333 Lead Reveals',
                'Full Lead Intelligence',
                'CSV/Excel Exports',
                'Priority Signal Access',
                'Credit Rollover',
                'Team Seats (up to 5)',
              ],
            },
          ].map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease }}
              whileHover={{ y: -6 }}
              className={`group relative flex flex-col transition-all duration-500 metallic-card`}
            >
              {/* Featured top specular highlight */}
              {p.featured && (
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              )}

              {/* Card inner */}
              <div className="relative z-10 p-6 md:p-7 flex flex-col flex-1">
                {/* Popular badge */}
                {p.featured && (
                  <span className="absolute top-6 right-6 text-[10px] font-bold tracking-ultra uppercase text-accent-purple">
                    Most Popular
                  </span>
                )}

                {/* Plan name & description */}
                <div className="mb-6">
                  <div
                    className={`w-8 h-8 rounded-md ${p.featured ? 'bg-accent-purple/10 border border-accent-purple/20 text-accent-purple' : 'bg-white/5 border border-white/5 text-text-secondary/60'} flex items-center justify-center mb-4`}
                  >
                    <SparklesIcon className="w-[18px] h-[18px]" />
                  </div>
                  <h4 className="font-display text-xl font-bold tracking-tight mb-1.5">{p.name}</h4>
                  <p className="text-xs text-text-secondary font-light leading-relaxed">{p.desc}</p>
                </div>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-white/[0.04]">
                  <div className="flex items-end gap-3 mb-3">
                    <span className="font-display text-4xl md:text-[44px] font-semibold leading-none tracking-tight text-text-primary">
                      {p.price}
                    </span>
                    <span className="text-text-secondary/60 mb-2 text-[10px] font-bold uppercase tracking-widest">during early access</span>
                  </div>

                  {/* Token meter bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-11">
                      <span className="text-text-secondary/60">{p.tokens} Credits</span>
                      <span className={`font-bold ${p.featured ? 'text-accent-purple' : 'text-text-secondary/60'}`}>{p.tokens} / mo</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: p.featured ? '100%' : i === 0 ? '30%' : '85%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.5 + i * 0.15, ease }}
                        className={`h-full bg-accent-${p.accent}/50 rounded-full`}
                      />
                    </div>
                  </div>
                </div>

                {/* Feature list */}
                <div className="flex-1 mb-6">
                  <ul className="space-y-2.5">
                    {p.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-center gap-3 text-xs text-text-secondary/80"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full bg-accent-${p.accent} shrink-0`}
                        />
                        <span className="font-light">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <Link
                  href="/register"
                  className={`block w-full py-2.5 rounded-xl font-semibold text-xs tracking-wide text-center transition-all duration-300 ${
                    p.featured
                      ? 'bg-accent-orange text-text-on-accent hover:brightness-110 shadow-[0_4px_20px_rgba(var(--rgb-accent-orange),0.3)]'
                      : 'bg-white/[0.04] shadow-[inset_0_1px_0_rgba(var(--rgb-white),0.06)] text-text-primary hover:bg-white/[0.07]'
                  }`}
                >
                  Get Started with {p.name}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom trust note */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease }}
          className="text-center mt-16 relative z-10"
        >
          <p className="text-xs text-text-secondary/40 font-mono uppercase tracking-super">
            Free during early access · Credits roll over each month
          </p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-20 px-4 sm:px-6 max-w-[800px] mx-auto">
        <div className="text-center mb-10">
          <span className="text-sm font-semibold text-accent-orange mb-3 block">
            FAQ
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease }}
            className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-center"
          >
            Frequently asked questions
          </motion.h2>
        </div>
        <div className="border-t border-white/[0.03]">
          <FAQItem
            q="Do you book clients for me?"
            a="NO. We provide warm, fresh leads actively looking for your service, with AI-scored buyer context so you know exactly how to approach them. You own the relationship."
          />
          <FAQItem
            q="Are these leads scraped from LinkedIn?"
            a="No. Standard scraping is noise. We monitor intent signals across obscure forums, job boards, and community threads where real pain is expressed."
          />
          <FAQItem
            q="How do credits work?"
            a="Credits fuel the intelligence engine. Revealing a lead identity costs between 2 and 10 credits depending on the contact data available (phone, email, or profile link). Unused credits roll over monthly."
          />
          <FAQItem
            q="Can I contact these leads myself?"
            a="Yes. You get the verified contact info and intelligence, and you reach out however you prefer: from your own email, LinkedIn, or phone. We focus on high-intent, quality conversations."
          />
        </div>
      </section>

      {/* Final CTA */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <section className="py-16 md:py-20 px-4 sm:px-6 max-w-[1000px] mx-auto text-center relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className="relative z-10 p-8 md:p-12 rounded-3xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-code-bg-dark to-page-bg overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--rgb-white),0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          <span className="text-sm font-semibold text-accent-orange mb-3 block">
            Get started
          </span>

          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-4 leading-snug">
            Stop Wasting Time <br />
            Looking For Clients.
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-light max-w-xl mx-auto mb-8 leading-relaxed">
            Lead Hunter Club brings fresh opportunities directly to you, while intelligence helps you start
            smarter conversations that actually get replies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 font-mono text-xs text-text-secondary/70">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
              Spend less time scraping.
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
              Spend more time closing.
            </span>
          </div>

          <div className="flex items-center justify-center gap-3.5">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-accent-orange text-text-on-accent font-semibold text-xs sm:text-sm shadow-[0_4px_20px_rgba(var(--rgb-accent-orange),0.3)] hover:brightness-110 transition-all duration-300 group"
              >
                Start Finding Leads
                <ArrowRightIcon className="w-4 h-4 text-current transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          {/* Supporting Text from docs/PRODUCT.md */}
          <div className="mt-8 font-mono text-11 tracking-super uppercase text-text-secondary/50 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>Fresh buyer-intent leads</span>
            <span className="text-accent-purple/40">•</span>
            <span>Smarter targeting</span>
            <span className="text-accent-purple/40">•</span>
            <span>Less wasted time</span>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <footer className="relative overflow-hidden">
        {/* Main footer content */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-16 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20">
            {/* Brand Column */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.svg"
                  alt="Lead Hunter Club"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg"
                />
                <span className="font-display text-2xl font-bold tracking-tight text-text-primary">
                  Lead Hunter Club
                </span>
              </div>
              <p className="text-sm text-text-secondary/70 font-light leading-relaxed mb-6 max-w-xs">
                Premium client acquisition intelligence for freelancers, agencies, and growth
                consultants who refuse to chase cold leads.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                {[
                  {
                    label: 'X',
                    icon: (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'LinkedIn',
                    icon: (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Instagram',
                    icon: (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-secondary/50 hover:text-text-primary hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div className="md:col-span-2">
              <h5 className="text-11 font-bold text-text-secondary/40 uppercase tracking-[0.15em] mb-5">
                Product
              </h5>
              <ul className="space-y-3">
                {['Features', 'How It Works', 'Pricing', 'Token System'].map((item) => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm text-text-secondary/70 hover:text-text-primary transition-colors duration-300 font-light"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div className="md:col-span-2">
              <h5 className="text-11 font-bold text-text-secondary/40 uppercase tracking-[0.15em] mb-5">
                Company
              </h5>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-text-secondary/70 hover:text-text-primary transition-colors duration-300 font-light"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stay Updated Column */}
            <div className="md:col-span-4">
              <h5 className="text-11 font-bold text-text-secondary/40 uppercase tracking-[0.15em] mb-5">
                Stay Updated
              </h5>
              <p className="text-sm text-text-secondary/60 font-light leading-relaxed mb-4">
                Get notified about new features, lead-hunting tactics, and platform updates.
              </p>
              <NewsletterSignup />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-11 font-mono text-text-secondary/30 uppercase tracking-[0.15em]">
              © 2026 Lead Hunter Club · All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-11 font-mono text-text-secondary/30 uppercase tracking-[0.12em] hover:text-text-secondary/60 transition-colors duration-300"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
