'use client'

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightIcon } from '@heroicons/react/24/solid'

const ease = [0.16, 1, 0.3, 1] as const

// ─── Data ────────────────────────────────────────────────────────────────────

export const REVIEW_IMAGES = [
  '/review/WhatsApp Image 2026-07-31 at 3.38.43 PM.jpeg',
  '/review/WhatsApp Image 2026-08-03 at 9.27.12 PM.jpeg',
  '/review/WhatsApp Image 2026-08-06 at 6.24.19 PM.jpeg',
  '/review/WhatsApp Image 2026-08-10 at 4.37.01 PM.jpeg',
  '/review/WhatsApp Image 2026-08-11 at 5.38.35 PM.jpeg',
  '/review/WhatsApp Image 2026-08-11 at 8.55.23 PM.jpeg',
  '/review/WhatsApp Image 2026-08-12 at 3.54.09 PM.jpeg',
  '/review/WhatsApp Image 2026-08-12 at 6.44.28 PM.jpeg',
  '/review/WhatsApp Image 2026-08-13 at 7.02.13 PM.jpeg',
  '/review/WhatsApp Image 2026-08-14 at 6.46.29 PM.jpeg',
  '/review/WhatsApp Image 2026-08-14 at 9.40.07 PM.jpeg',
  '/review/WhatsApp Image 2026-08-18 at 6.35.01 PM.jpeg',
  '/review/WhatsApp Image 2026-08-18 at 7.14.23 PM.jpeg',
  '/review/WhatsApp Image 2026-08-19 at 5.09.45 PM.jpeg',
  '/review/WhatsApp Image 2026-08-20 at 8.06.19 PM.jpeg',
  '/review/WhatsApp Image 2026-08-24 at 9.42.52 PM.jpeg',
  '/review/WhatsApp Image 2026-08-25 at 6.23.55 PM.jpeg',
  '/review/WhatsApp Image 2026-08-26 at 10.34.15 PM.jpeg',
  '/review/WhatsApp Image 2026-08-26 at 7.34.40 PM.jpeg',
  '/review/WhatsApp Image 2026-08-27 at 4.18.23 PM.jpeg',
  '/review/WhatsApp Image 2026-08-27 at 5.18.49 PM.jpeg',
]

// Positions for the flying reviews in the reviews explosion (relative coordinates)
const FLYING_POSITIONS = [
  { x: -350, y: -220, r: -8, scale: 0.95, driftX: 8, driftY: -10, duration: 6 },
  { x: 350, y: -220, r: 8, scale: 0.95, driftX: -8, driftY: -8, duration: 7 },
  { x: -430, y: 10, r: -12, scale: 1, driftX: 10, driftY: 8, duration: 5.5 },
  { x: 430, y: 10, r: 12, scale: 1, driftX: -10, driftY: 10, duration: 6.5 },
  { x: -320, y: 240, r: -6, scale: 0.85, driftX: 6, driftY: -12, duration: 8 },
  { x: 320, y: 240, r: 6, scale: 0.85, driftX: -6, driftY: -10, duration: 7.5 },
  { x: -170, y: -330, r: -4, scale: 0.95, driftX: 12, driftY: 6, duration: 9 },
  { x: 170, y: -330, r: 4, scale: 0.95, driftX: -12, driftY: 8, duration: 8.5 },
  { x: -160, y: 340, r: -5, scale: 0.85, driftX: 8, driftY: -8, duration: 7 },
  { x: 160, y: 340, r: 5, scale: 0.85, driftX: -8, driftY: 6, duration: 6.8 },
  { x: -500, y: -200, r: -10, scale: 0.8, driftX: -12, driftY: -12, duration: 10 },
  { x: 500, y: -200, r: 10, scale: 0.8, driftX: 12, driftY: -10, duration: 9.5 },
]

// ─── Review Screenshot Card ──────────────────────────────────────────────────

export function ReviewScreenshotCard({ 
  imageUrl, 
  index, 
  isFeatured = false 
}: { 
  imageUrl: string
  index: number
  isFeatured?: boolean
}) {
  const ACCENT_COLORS = ['mint', 'purple', 'cyan', 'orange'] as const
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]

  return (
    <div
      className={`review-card-interactive relative rounded-xl border overflow-hidden p-1 h-full flex flex-col justify-center transition-all duration-500 ${
        isFeatured 
          ? 'bg-surface/90 border-accent-orange shadow-[0_0_30px_rgba(var(--rgb-accent-orange),0.25)] scale-[1.02]' 
          : 'border-white/[0.05] bg-surface/40 hover:scale-[1.02]'
      }`}
      style={{
        '--glow-color': isFeatured ? 'rgba(var(--rgb-accent-orange), 0.35)' : `rgba(var(--rgb-accent-${accent}), 0.22)`,
        '--border-color': isFeatured ? 'rgba(var(--rgb-accent-orange), 0.35)' : `rgba(var(--rgb-accent-${accent}), 0.18)`,
        '--bg-hover-color': isFeatured ? 'rgba(var(--rgb-accent-orange), 0.05)' : `rgba(var(--rgb-accent-${accent}), 0.02)`,
      } as React.CSSProperties}
    >
      {/* Specular Top Edge on Hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {/* Screenshot Container */}
      <div className="relative rounded-lg overflow-hidden flex items-center justify-center flex-1">
        <img
          src={imageUrl}
          alt="LeadHunterClub Client Review Screenshot"
          className="w-full h-auto object-contain block transition-transform duration-500"
          loading="lazy"
        />
      </div>
    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function TestimonialsSection() {
  const [isHovered, setIsHovered] = React.useState(false)
  const [particles, setParticles] = React.useState<{ id: number; left: number; size: number; rotation: number; delay: number; duration: number; symbol: string }[]>([])

  // Show a clean preview of 6 reviews on the homepage
  const homepageReviews = REVIEW_IMAGES.slice(0, 6)
  // Use subsequent reviews for the interactive flying cards overlay
  const flyingReviews = REVIEW_IMAGES.slice(6, 18)

  // Emit brand reaction particles continuously when hovered
  React.useEffect(() => {
    if (!isHovered) {
      setParticles([])
      return
    }

    let particleId = 0
    const symbols = ['⭐', '✨', '💛']
    const interval = setInterval(() => {
      const newParticle = {
        id: particleId++,
        left: Math.random() * 160 - 80, // Spawn offset near center card
        size: Math.random() * 16 + 18,   // Size between 18px and 34px
        rotation: Math.random() * 50 - 25, // Random rotation offset
        delay: 0,
        duration: Math.random() * 1.5 + 1.8, // Duration between 1.8s and 3.3s
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
      }
      setParticles((prev) => [...prev.slice(-40), newParticle]) // Keep max 40 particles active
    }, 120)

    return () => clearInterval(interval)
  }, [isHovered])

  return (
    <section
      id="testimonials"
      className="py-16 md:py-20 px-4 sm:px-6 max-w-[1100px] mx-auto relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* Self-contained float-heart & drift animations */}
      <style jsx global>{`
        @keyframes float-heart {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translate(calc(var(--heart-end-x) * 0.2), -50px) scale(1) rotate(calc(var(--heart-rotate) * 0.2));
          }
          100% {
            transform: translate(var(--heart-end-x), -380px) scale(var(--heart-scale)) rotate(var(--heart-rotate));
            opacity: 0;
          }
        }
        @keyframes slow-drift {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(var(--drift-x), var(--drift-y)) rotate(var(--drift-r));
          }
        }
        .drift-active {
          animation: slow-drift var(--drift-duration) ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-sm font-semibold text-accent-orange mb-3 block">
            What people say
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.08, ease }}
          className="font-display text-2xl sm:text-3xl md:text-[38px] font-semibold tracking-tight text-text-primary leading-[1.15] mb-4 max-w-2xl mx-auto"
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
          className="text-sm sm:text-base text-text-secondary/60 max-w-lg mx-auto leading-relaxed"
        >
          Freelancers, designers, and agency owners share exactly what changed after switching to
          LeadHunterClub.
        </motion.p>
      </div>

      {/* Live Feed Status Notice */}
      <div className="flex items-center justify-center gap-2.5 text-[12px] text-text-secondary/45 leading-relaxed mb-12 relative z-10">
        <span>✨</span>
        <span>These screenshots are shared directly by active members inside our club: this feed is live.</span>
      </div>

      {/* Reviews Grid & Hover Interactive Zone */}
      <div className="relative z-10 mb-14 min-h-[500px] flex items-center justify-center">
        {/* Normal Grid state */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full transition-all duration-700 ${isHovered ? 'blur-[4px] scale-[0.97] opacity-15' : 'opacity-100 blur-0 scale-100'}`}>
          {homepageReviews.map((imageUrl, index) => {
            const isMiddleTrigger = index === 1
            return (
              <div
                key={imageUrl}
                className={`h-full relative ${isMiddleTrigger ? 'cursor-pointer' : ''}`}
                onMouseEnter={isMiddleTrigger ? () => setIsHovered(true) : undefined}
              >
                {isMiddleTrigger && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-orange text-bg-main border border-accent-orange/40 text-[10px] font-mono font-bold tracking-wider uppercase shadow-[0_4px_14px_rgba(var(--rgb-accent-orange),0.35)] whitespace-nowrap">
                    <span>✨</span>
                    <span>Reviews (what people say)</span>
                  </div>
                )}
                <ReviewScreenshotCard imageUrl={imageUrl} index={index} />
              </div>
            )
          })}
        </div>

        {/* Fullscreen Overlay trigger mode */}
        <AnimatePresence>
          {isHovered && (
            <div 
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Backing Ambient Dark Wash with Brand Radial Gradient */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-[-100px] bg-[#0A0A0F]/80 backdrop-blur-md z-0 pointer-events-none flex items-center justify-center"
              >
                <div className="absolute w-[650px] h-[650px] rounded-full blur-[140px] bg-[radial-gradient(circle,rgba(var(--rgb-accent-orange),0.20)_0%,rgba(var(--rgb-persona-purple),0.08)_50%,transparent_75%)] pointer-events-none" />
              </motion.div>

              {/* Reaction Particle Emitter Node (centered behind the spotlight card) */}
              <div className="absolute z-10 w-10 h-10 pointer-events-none">
                {particles.map((p) => (
                  <span
                    key={p.id}
                    className="absolute pointer-events-none filter drop-shadow-[0_0_12px_rgba(var(--rgb-accent-orange),0.8)]"
                    style={{
                      left: `${p.left}px`,
                      bottom: '50px',
                      fontSize: `${p.size}px`,
                      '--heart-end-x': `${p.left * 2.5}px`,
                      '--heart-scale': `${Math.random() * 0.4 + 0.8}`,
                      '--heart-rotate': `${p.rotation * 2.5}deg`,
                      animation: `float-heart ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    } as React.CSSProperties}
                  >
                    {p.symbol}
                  </span>
                ))}
              </div>

              {/* Flying Boomerang reviews */}
              {flyingReviews.map((imageUrl, index) => {
                const pos = FLYING_POSITIONS[index % FLYING_POSITIONS.length]
                return (
                  <motion.div
                    key={`flying-${index}`}
                    initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
                    animate={{ 
                      x: pos.x, 
                      y: pos.y, 
                      scale: pos.scale, 
                      opacity: 1, 
                      rotate: pos.r 
                    }}
                    exit={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 85,
                      damping: 15,
                      mass: 1.1,
                      delay: index * 0.03
                    }}
                    className="absolute z-10 w-[240px] pointer-events-auto"
                  >
                    {/* Inner wrapper handling drifting animation */}
                    <div 
                      className="drift-active"
                      style={{
                        '--drift-x': `${pos.driftX}px`,
                        '--drift-y': `${pos.driftY}px`,
                        '--drift-r': `${pos.r + (pos.driftX > 0 ? 2 : -2)}deg`,
                        '--drift-duration': `${pos.duration}s`,
                      } as React.CSSProperties}
                    >
                      <ReviewScreenshotCard imageUrl={imageUrl} index={index + 6} />
                    </div>
                  </motion.div>
                )
              })}

              {/* Spotlight Center featured trigger card */}
              <motion.div 
                layoutId="spotlight-card"
                className="relative z-20 w-[350px] shadow-[0_0_50px_rgba(var(--rgb-accent-orange),0.3)] pointer-events-auto"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1.05 }}
                exit={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-orange text-bg-main border border-accent-orange/40 text-[10px] font-bold tracking-wider uppercase shadow-[0_4px_14px_rgba(var(--rgb-accent-orange),0.4)] whitespace-nowrap">
                  <span>✨</span>
                  <span>Reviews (what people say)</span>
                </div>
                <ReviewScreenshotCard imageUrl={homepageReviews[1]} index={1} isFeatured={true} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease }}
        className="flex items-center justify-center mt-16 relative z-10"
      >
        <Link
          href="/reviews"
          className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/15 text-sm text-text-secondary hover:text-text-primary transition-all duration-300 cursor-pointer"
        >
          See all reviews
          <ArrowRightIcon className="w-[14px] h-[14px] group-hover:translate-x-1 transition-transform duration-300" />
        </Link>
      </motion.div>
    </section>
  )
}
