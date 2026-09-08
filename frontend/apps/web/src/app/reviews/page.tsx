'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { REVIEW_IMAGES, ReviewScreenshotCard } from '@/app/components/TestimonialsSection'

const ease = [0.16, 1, 0.3, 1] as const

export default function ReviewsPage() {
  return (
    <main className="relative min-h-screen bg-[#0A0A0F] overflow-hidden text-text-primary font-sans">
      {/* Background radial glow accents using LeadHunterClub brand colors */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#0A0A0F]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(var(--rgb-accent-orange),0.08)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[1000px] bg-[radial-gradient(ellipse_at_center,rgba(var(--rgb-accent-orange),0.07)_0%,rgba(var(--rgb-accent-purple),0.04)_40%,transparent_70%)]" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto pt-40 pb-24 px-6">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <span className="text-[10px] font-bold tracking-ultra uppercase mb-6 block text-accent-orange">
              Reviews (what people say)
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="font-display text-[42px] md:text-[56px] font-semibold tracking-tight text-text-primary leading-[1.1] mb-5"
          >
            What People Say
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="text-base text-text-secondary/60 max-w-xl mx-auto leading-relaxed mb-6"
          >
            See why freelancers, designers, and agency owners trust Lead Hunter Club. Real feedback screenshots shared in our active channels.
          </motion.p>

          {/* Live Feed Status Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.22, ease }}
            className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] text-[12px] text-text-secondary/45"
          >
            <span>✨</span>
            <span>This feed is live and updated directly with feedback screenshots.</span>
          </motion.div>
        </div>

        {/* Masonry Grid (using modern CSS column-count) */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {REVIEW_IMAGES.map((imageUrl, index) => (
            <motion.div
              key={imageUrl}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease }}
              className="break-inside-avoid mb-6"
            >
              <ReviewScreenshotCard imageUrl={imageUrl} index={index} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}
