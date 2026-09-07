'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRightIcon, StarIcon } from '@heroicons/react/24/solid'

const ease = [0.16, 1, 0.3, 1] as const

// ─── Data ────────────────────────────────────────────────────────────────────

interface Highlight {
  label: string
  tag: string
  tagColor: string
  detail: string
}

interface Testimonial {
  id: string
  name: string
  handle: string
  role: string
  accentToken: string
  initials: string
  quote: string
  result: string
  highlights: Highlight[]
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 'alex',
    name: 'Alex Moreno',
    handle: '@alexmoreno_dev',
    role: 'Freelance Developer',
    accentToken: 'accent-purple',
    initials: 'AM',
    result: '$4,200 contract in week 1',
    quote:
      'Found a $4k Shopify contract within my first week. The intent signals are insanely accurate — it honestly felt like cheating.',
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: 'Manually browsing Reddit',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Spent 2–3 hours a day manually scrolling forums hoping to stumble across someone asking for dev help.',
      },
      {
        label: 'What changed',
        tag: 'Buyer Intent Signals',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'LeadHunter surfaces the exact posts with buyer intent — no guesswork.',
      },
      {
        label: 'Their result',
        tag: '+28% Reply Rate',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Went from a 4% reply rate to 28% in under a month. First paid contract landed in week one.',
      },
    ],
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    handle: '@priyaux',
    role: 'UI/UX Designer',
    accentToken: 'accent-purple',
    initials: 'PS',
    result: '3 retainers closed in 30 days',
    quote:
      "LeadHunter surfaces clients I'd never find on my own. Every lead already wants design help — it's that good.",
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: 'Cold job board applications',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Sending 30+ cold applications a week on Contra and Upwork with a 2% callback rate at best.',
      },
      {
        label: 'What changed',
        tag: 'Intent Scoring',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          "Every lead is ranked by urgency and budget signal — she pitches only when there's a real buying signal.",
      },
      {
        label: 'Their result',
        tag: '3 Retainers / 30 Days',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Closed three ongoing monthly design retainers by week four. Zero cold applications sent since.',
      },
    ],
  },
  {
    id: 'koen',
    name: 'Koen Voss',
    handle: '@koenvoss',
    role: 'Brand Designer',
    accentToken: 'tab-purple',
    initials: 'KV',
    result: 'Replaced job boards entirely',
    quote:
      'I stopped wasting time on job boards. Warm intent leads close 3x faster — the quality difference is night and day.',
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: 'Waiting on referrals',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Revenue was entirely dependent on word-of-mouth. Dry months with no predictable pipeline whatsoever.',
      },
      {
        label: 'What changed',
        tag: 'Verified Buyer Contacts',
        tagColor: 'bg-tab-purple/10 border-tab-purple/20 text-tab-purple',
        detail:
          'Every lead arrives with verified contact info and clear buying intent. Deals move forward even when he\'s heads-down on client work.',
      },
      {
        label: 'Their result',
        tag: '3× Faster Closes',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Warm intent leads close three times faster than cold applications. Fully replaced job boards within 6 weeks.',
      },
    ],
  },
  {
    id: 'marcus',
    name: 'Marcus Tse',
    handle: '@marcustse',
    role: 'Full-Stack Developer',
    accentToken: 'accent-purple',
    initials: 'MT',
    result: 'Response rate: 4% → 28%',
    quote:
      'The buyer context on every lead is spot on. My response rates went from 4% to 28%.',
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: 'Generic cold outreach',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Reaching out to the same kind of prospects with no idea who was actually ready to buy.',
      },
      {
        label: 'What changed',
        tag: 'AI Context Insight',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Every lead comes with the exact signal that triggered it — founders respond because the timing feels personal.',
      },
      {
        label: 'Their result',
        tag: '7× More Pipeline',
        tagColor: 'bg-tab-purple/10 border-tab-purple/20 text-tab-purple',
        detail:
          'Pipeline grew 7x in 45 days. Now closes 2–3 new contracts monthly without any additional marketing spend.',
      },
    ],
  },
  {
    id: 'jade',
    name: 'Jade Williams',
    handle: '@jadegrowth',
    role: 'SMMA Owner',
    accentToken: 'accent-purple',
    initials: 'JW',
    result: '2 → 8 retainers in 60 days',
    quote:
      'Scaled from 2 to 8 retainer clients in 60 days. This is the unfair advantage agencies need. Nothing else comes close.',
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: 'Burned out on cold DMs',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Sending 50+ cold DMs daily across Instagram and LinkedIn with almost no response. Team was exhausted.',
      },
      {
        label: 'What changed',
        tag: 'Multi-Platform Feed',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'One feed now aggregates high-intent signals from 5 platforms. The team pitches only when a real buying signal exists.',
      },
      {
        label: 'Their result',
        tag: '4× Revenue in 60 Days',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Grew from $6k/mo to $24k/mo MRR in two months. Paid lead-gen budget reduced to zero.',
      },
    ],
  },
  {
    id: 'david',
    name: 'David Kaur',
    handle: '@davidkaur',
    role: 'Agency Owner',
    accentToken: 'tab-purple',
    initials: 'DK',
    result: 'Replaced entire SDR stack',
    quote:
      'We replaced our SDR research stack with LeadHunter. Same pipeline at 20% of the cost. I wish I found it sooner.',
    highlights: [
      {
        label: 'Before LeadHunter',
        tag: '3 full-time SDRs',
        tagColor: 'bg-white/5 border-white/10 text-text-secondary/60',
        detail:
          'Running a 3-person outbound team at $15k/mo in salaries. Results were inconsistent and hard to scale.',
      },
      {
        label: 'What changed',
        tag: 'Verified Contacts',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'LeadHunter now handles lead discovery, enrichment, and pipeline tracking — no seat cost.',
      },
      {
        label: 'Their result',
        tag: '80% Cost Reduction',
        tagColor: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
        detail:
          'Eliminated 3 SDR salaries while hitting the same pipeline targets. Reinvested savings into product and growth.',
      },
    ],
  },
]

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className="review-card-interactive relative flex flex-col p-6 md:p-8 rounded-2xl border border-white/[0.05] bg-surface/60 overflow-hidden h-full group"
      style={{
        '--glow-color': `rgba(var(--rgb-${testimonial.accentToken}), 0.25)`,
        '--border-color': `rgba(var(--rgb-${testimonial.accentToken}), 0.20)`,
        '--bg-hover-color': `rgba(var(--rgb-${testimonial.accentToken}), 0.03)`,
      } as React.CSSProperties}
    >
      {/* Ambient glow corner on hover */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 blur-xl rounded-full pointer-events-none opacity-20 transition-opacity duration-300 group-hover:opacity-45"
        style={{ background: `var(--color-${testimonial.accentToken})` }}
      />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Initials Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
            style={{
              background: `rgba(var(--rgb-${testimonial.accentToken}), 0.07)`,
              borderColor: `rgba(var(--rgb-${testimonial.accentToken}), 0.12)`,
              color: `var(--color-${testimonial.accentToken})`,
            }}
          >
            {testimonial.initials}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{testimonial.name}</div>
            <div className="text-[10px] text-text-secondary/40 font-mono truncate">{testimonial.handle}</div>
          </div>
        </div>

        {/* Result Badge */}
        <div
          className="inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider shrink-0"
          style={{
            background: `rgba(var(--rgb-${testimonial.accentToken}), 0.05)`,
            borderColor: `rgba(var(--rgb-${testimonial.accentToken}), 0.10)`,
            color: `var(--color-${testimonial.accentToken})`,
          }}
        >
          {testimonial.result}
        </div>
      </div>

      {/* Role / Rating */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11px] text-text-secondary/60 font-medium">{testimonial.role}</span>
        
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <StarIcon
              key={i}
              className="w-[11px] h-[11px]"
              style={{ color: `var(--color-${testimonial.accentToken})`, opacity: 0.8 }}
            />
          ))}
        </div>
      </div>

      {/* Quote */}
      <p className="text-[13px] text-text-primary/95 leading-relaxed font-light mb-6 flex-1">
        &ldquo;{testimonial.quote}&rdquo;
      </p>


    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="py-36 px-6 max-w-[1200px] mx-auto relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* Ambient glow decoration */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-purple-medium pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-[10px] font-bold tracking-ultra uppercase mb-6 block text-accent-purple">
            Customer Reviews
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.08, ease }}
          className="font-display text-[38px] md:text-[52px] font-semibold tracking-tight text-text-primary leading-[1.1] mb-5 max-w-3xl mx-auto"
        >
          Real results from real people.
          <br />
          <span className="text-text-secondary/60">No fluff, just outcomes.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="text-base text-text-secondary/60 max-w-lg mx-auto leading-relaxed"
        >
          Freelancers, designers, and agency owners share exactly what changed after switching to
          LeadHunterClub.
        </motion.p>
      </div>

      {/* Reviews Grid */}
      <div className="relative z-10 mb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {TESTIMONIALS.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: index * 0.08, ease }}
              className="h-full"
            >
              <ReviewCard testimonial={t} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease }}
        className="flex items-center justify-center mt-16 relative z-10"
      >
        <button className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/15 text-sm text-text-secondary hover:text-text-primary transition-all duration-300 cursor-pointer">
          See all reviews
          <ArrowRightIcon className="w-[14px] h-[14px] group-hover:translate-x-1 transition-transform duration-300" />
        </button>
      </motion.div>
    </section>
  )
}
