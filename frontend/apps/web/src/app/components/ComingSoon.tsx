'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1] as const

export default function ComingSoon() {
  const reduce = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)

  // React can drop the SSR `muted` attribute — force it so autoplay is allowed.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    if (!reduce) v.play().catch(() => {})
  }, [reduce])

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease },
        }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-bg-main font-sans text-text-primary">
      {/* Full-bleed looping background video (wolf poster shows until it plays) */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center"
        poster="/images/hero-wolf.png"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/videos/1003.mp4" type="video/mp4" />
      </video>

      {/* Left-weighted scrims — copy sits on the dark side, footage breathes on the right */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(9,11,16,0.95)_0%,rgba(9,11,16,0.82)_38%,rgba(9,11,16,0.35)_72%,rgba(9,11,16,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,16,0.75)_0%,transparent_28%,transparent_70%,rgba(9,11,16,0.8)_100%)] md:bg-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1280px] flex-col px-5 sm:px-6">
        {/* Brand bar */}
        <motion.header
          {...rise(0.05)}
          className="flex items-center justify-between py-6 sm:py-8"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">
              LeadHunterClub
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent-orange">
            Coming soon
          </span>
        </motion.header>

        {/* Hero — left-anchored, asymmetric */}
        <section className="flex flex-1 items-center py-14 sm:py-20">
          <div className="w-full max-w-[640px]">
            <motion.div
              {...rise(0.15)}
              className="mb-7 flex items-center gap-4"
            >
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-accent-orange">
                Stop chasing clients.
              </span>
              <span className="h-px w-16 bg-accent-orange/40" />
            </motion.div>

            <motion.h1
              {...rise(0.25)}
              className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.03em] text-white sm:text-6xl lg:text-[5.5rem]"
            >
              Coming soon<span className="text-accent-orange">.</span>
            </motion.h1>

            <motion.h2
              {...rise(0.32)}
              className="mt-6 max-w-[20ch] font-display text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-white/85 sm:text-[27px]"
            >
              Find people already looking for what you sell.
            </motion.h2>

            <motion.p
              {...rise(0.4)}
              className="mt-5 max-w-[54ch] text-[16.5px] leading-[1.7] text-white/60 sm:text-[17.5px]"
            >
              LeadHunter monitors public conversations for fresh buying signals, filters out the
              noise, and gives you the context and contact information you need to turn real demand
              into real conversations.
            </motion.p>

            {/* Primary ask: existing members create the account → full onboarding flow */}
            <motion.div {...rise(0.45)} className="mt-9">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="group inline-flex min-h-[52px] items-center gap-2.5 rounded-xl bg-accent-orange px-7 text-[15px] font-bold text-[#141414] transition-all duration-300 hover:brightness-110 active:translate-y-px"
                >
                  Create your account
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </Link>
              </div>
              <p className="mt-4 max-w-[50ch] text-[13.5px] leading-relaxed text-white/50">
                The platform isn&apos;t fully live yet. Until launch, LeadHunter Club members can
                create an account and start onboarding — so you&apos;re ready to hunt on day one.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <motion.footer
          {...rise(0.6)}
          className="flex flex-col gap-1.5 border-t border-white/[0.07] py-5 text-[12.5px] text-white/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>&copy; 2026 LeadHunterClub</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">
            Verified buyer intent &middot; Sales intelligence
          </span>
        </motion.footer>
      </div>
    </main>
  )
}
