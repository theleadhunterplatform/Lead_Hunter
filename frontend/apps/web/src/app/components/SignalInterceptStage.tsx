'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// ==========================================
// AUTHENTIC VECTOR BRAND LOGOS (ZERO NEON GLOW)
// ==========================================

export function RedditOfficialLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Reddit">
      <circle cx="12" cy="12" r="12" fill="#FF4500" />
      <path
        d="M12 4.75a1.25 1.25 0 0 1 1.25 1.25c0 .64-.48 1.17-1.11 1.24l.8 3.75c1.82.07 3.48.63 4.67 1.49.31-.31.73-.49 1.21-.49.97 0 1.75.79 1.75 1.75 0 .72-.43 1.33-1.01 1.61.03.17.04.35.04.52 0 2.69-3.13 4.87-7 4.87s-7-2.18-7-4.87c0-.18.01-.36.04-.53A1.75 1.75 0 0 1 3.63 13.75c0-.97.79-1.75 1.75-1.75.46 0 .9.2 1.21.49 1.2-.88 2.88-1.43 4.74-1.49l.89-4.18.24-.04 2.9.62c.04.66.58 1.2 1.26 1.2.69 0 1.25-.56 1.25-1.25a1.25 1.25 0 0 1-1.25-1.25 1.21 1.21 0 0 0-1.11.7l-2.6-.55-.8 3.75M8.85 13.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm6.3 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm-5.77 4.39a.33.33 0 0 0 .23.1c.83 0 1.98-.2 2.51-.73a.33.33 0 0 0-.46-.46c-.48.48-2.12.55-2.96.91a.33.33 0 0 0 .22.18z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

export function LinkedinOfficialLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="LinkedIn">
      <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
      <path
        d="M7.12 9.5H4.88V19H7.12V9.5ZM6 5.5C5.28 5.5 4.7 6.08 4.7 6.8C4.7 7.52 5.28 8.1 6 8.1C6.72 8.1 7.3 7.52 7.3 6.8C7.3 6.08 6.72 5.5 6 5.5ZM19.12 19V13.88C19.12 11.37 17.78 10.2 15.98 10.2C14.53 10.2 13.88 11 13.52 11.56V9.5H11.28V19H13.52V14.12C13.52 12.83 13.77 11.58 15.37 11.58C16.94 11.58 16.96 13.05 16.96 14.2V19H19.12Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

export function ThreadsOfficialLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Threads">
      <rect width="24" height="24" rx="5" fill="#121212" stroke="#2D2D30" strokeWidth="1" />
      <path
        d="M17.41 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C20.587 2.078 17.478 0 12.81 0 5.374 0 .315 5.277.315 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"
        fill="#FFFFFF"
        transform="scale(0.85) translate(2, 2)"
      />
    </svg>
  )
}

const PLATFORMS = ['reddit', 'linkedin', 'threads'] as const
type PlatformKey = (typeof PLATFORMS)[number]

export function SignalInterceptStage() {
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  const advance = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % PLATFORMS.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(advance, 4500)
    return () => clearInterval(interval)
  }, [isPaused, advance])

  const platform = PLATFORMS[activeIdx]

  return (
    <div
      className="w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        {platform === 'reddit' && (
          <motion.div
            key="reddit-post-card"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full rounded-2xl bg-[#1A1A1B] border border-[#343536] p-4 sm:p-5 text-left shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            {/* Reddit Subreddit Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <motion.div
                  initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                >
                  <RedditOfficialLogo className="w-8 h-8 shrink-0" />
                </motion.div>
                <div className="flex items-center gap-1.5 text-[12px] whitespace-nowrap overflow-hidden">
                  <span className="font-bold text-white hover:underline cursor-pointer">
                    r/smallbusiness
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-400">Posted by u/growth_pilot</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-500">4m ago</span>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FF4500]/15 text-[#FF5414] border border-[#FF4500]/30 shrink-0 whitespace-nowrap">
                Hiring
              </span>
            </div>

            {/* Reddit Title */}
            <h4 className="text-[15px] sm:text-[16px] font-semibold text-white mb-2 leading-snug">
              We need a meta ads expert for our Q4 scale
            </h4>

            {/* Reddit Body */}
            <p className="text-[12.5px] sm:text-[13px] text-[#D7DADC]/90 leading-relaxed font-normal mb-4">
              Currently spending $12k/mo on Meta. Looking for an expert or boutique agency to audit our ad account, fix creative fatigue, and scale past $50k. Please DM with case studies.
            </p>

            {/* Authentic Reddit Footer Action Bar */}
            <div className="flex items-center gap-2 text-[12px] text-zinc-300 font-semibold">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#272729]">
                <span className="text-[11px] text-zinc-400">▲</span>
                <span>28</span>
                <span className="text-[11px] text-zinc-500">▼</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#272729]">
                <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>14 comments</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#272729]">
                <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>Share</span>
              </div>
            </div>
          </motion.div>
        )}

        {platform === 'linkedin' && (
          <motion.div
            key="linkedin-post-card"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full rounded-xl bg-[#1D2226] border border-[#38434F] p-4 sm:p-5 text-left shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            {/* LinkedIn Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0A66C2] to-cyan-700 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/10 shadow-sm">
                  MV
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                    <span className="truncate">Marcus Vance</span>
                    <span className="text-[11px] text-zinc-400 font-normal shrink-0">· 2nd</span>
                  </div>
                  <div className="text-[11.5px] text-zinc-400 truncate">
                    Founder & Creative Director @ Aurum Jewelry
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <span>18m</span>
                    <span>·</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>

              <motion.div
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="shrink-0"
              >
                <LinkedinOfficialLogo className="w-6 h-6" />
              </motion.div>
            </div>

            {/* LinkedIn Content */}
            <p className="text-[12.5px] sm:text-[13px] text-zinc-200 leading-relaxed font-normal mb-2">
              Starting a brand for fine jewelry and need a world-class web designer who can do custom Shopify Plus, 3D embeds, and bespoke micro-interactions. Drop your portfolio below or DM.
            </p>

            <div className="flex flex-wrap gap-1.5 text-[11.5px] text-[#70B5F9] font-medium mb-3">
              <span>#webdesign</span>
              <span>#shopify</span>
              <span>#luxury</span>
              <span>#ecommerce</span>
            </div>

            {/* Stats Row */}
            <div className="pt-2 border-b border-white/[0.08] pb-2 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center -space-x-1">
                  <span className="w-4 h-4 rounded-full bg-[#0A66C2] text-[9px] text-white flex items-center justify-center">👍</span>
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-[9px] text-white flex items-center justify-center">❤️</span>
                </span>
                <span>42</span>
              </div>
              <span>18 comments · 4 reposts</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 pt-2 text-[11.5px] font-medium text-zinc-400">
              <button type="button" className="flex items-center justify-center gap-1.5 py-1 hover:text-zinc-200 transition-colors">
                <span>👍</span>
                <span>Like</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-1 hover:text-zinc-200 transition-colors">
                <span>💬</span>
                <span>Comment</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-1 hover:text-zinc-200 transition-colors">
                <span>🔁</span>
                <span>Repost</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-1 hover:text-zinc-200 transition-colors">
                <span>✈️</span>
                <span>Send</span>
              </button>
            </div>
          </motion.div>
        )}

        {platform === 'threads' && (
          <motion.div
            key="threads-post-card"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full rounded-2xl bg-[#101010] border border-[#262626] p-4 sm:p-5 text-left shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            {/* Threads Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  SC
                </div>
                <div className="flex items-center gap-1.5 min-w-0 text-[13px]">
                  <span className="font-semibold text-white truncate">sarah.chen</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500 text-[12px]">9m</span>
                </div>
              </div>

              <motion.div
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="shrink-0"
              >
                <ThreadsOfficialLogo className="w-6 h-6" />
              </motion.div>
            </div>

            {/* Threads Content */}
            <p className="text-[13.5px] sm:text-[14px] text-zinc-100 leading-relaxed font-normal mb-4">
              Need a Webflow & automation expert who can overhaul our client onboarding portal by next Friday. Budget is flexible, just need top-tier execution. Who should I talk to?
            </p>

            {/* Threads Action Bar */}
            <div className="flex items-center justify-between pt-1 text-zinc-400">
              <div className="flex items-center gap-4 text-[15px]">
                <button type="button" className="hover:text-rose-400 transition-colors">♡</button>
                <button type="button" className="hover:text-zinc-200 transition-colors">💬</button>
                <button type="button" className="hover:text-zinc-200 transition-colors">🔁</button>
                <button type="button" className="hover:text-zinc-200 transition-colors">✈️</button>
              </div>

              <span className="text-[11.5px] text-zinc-500">34 likes · 12 replies</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
