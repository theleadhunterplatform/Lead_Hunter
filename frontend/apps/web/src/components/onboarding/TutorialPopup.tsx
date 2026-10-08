'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckIcon, PlayIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { triggerUnlockConfetti } from '@/lib/confetti'

/**
 * First-visit tutorial popup (Stage D — Apple-keynote polish pass).
 *
 * 4 states: welcome → how-to → credits → done (confetti + CTA).
 * Hero video on top, big question title + small supporting blurb below,
 * 3-segment progress bar (one third per video, watch-driven).
 * Follows the CommunityWinPopup shell pattern (AnimatePresence + spring,
 * fixed inset-0 z-[100], backdrop blur, ESC + scroll lock), upgraded with
 * Apple-style vibrancy: saturating backdrop blur, an amber ambient light
 * wash behind the panel, a hairline-lit 28px shell, frosted play control,
 * mono step pill, springy staggered step transitions.
 *
 * Seen-flag: localStorage `lh_tutorial_seen` (dev force-open via `?tutorial=1`).
 */

const TUTORIAL_SEEN_KEY = 'lh_tutorial_seen'

/** `STEPS.length` is the done state (3 videos watched → CTA). */
type TutorialStep = 0 | 1 | 2 | 3

type TutorialStepDef = {
  readonly id: string
  readonly title: string
  readonly blurb: string
  readonly src: string
  readonly poster: string
}

const STEPS: TutorialStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to LeadHunter.',
    blurb:
      'A quick hello: what LeadHunter does, where your 50 free credits came from, and what the dashboard can do.',
    src: '/videos/tutorial-welcome.mp4',
    poster: '/videos/tutorial-welcome-poster.jpg',
  },
  {
    id: 'how-to',
    title: 'So how do I actually use the platform?',
    blurb:
      'Search for people already asking for what you sell, filter the noise, and save a lead you like.',
    src: '/videos/tutorial-platform.mp4',
    poster: '/videos/tutorial-platform-poster.jpg',
  },
  {
    id: 'credits',
    title: 'How do credits work?',
    blurb: 'Credits unlock the hidden details: 10 for an email, 12 for a phone, 15 for both.',
    src: '/videos/tutorial-credits.mp4',
    poster: '/videos/tutorial-credits-poster.jpg',
  },
]

/** Equal thirds: 33.33… / 66.66… / 100 across the 3 video steps. */
const SEGMENT = 100 / STEPS.length

/** Fill % for segment `index` given an absolute progress value 0–100. */
function segmentFill(value: number, index: number): number {
  const raw = ((value - index * SEGMENT) / SEGMENT) * 100
  return Math.min(100, Math.max(0, raw))
}

/** Explicit tuples so framer's `Variants` typing accepts them (no widening). */
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1]

/** Dev force-open: `?tutorial=1` re-tests on every refresh (mirrors `?preview=1`). */
function isDevForceOpen(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    new URLSearchParams(window.location.search).get('tutorial') === '1'
  )
}

function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markTutorialSeen(): void {
  // While the dev force-open param is present, never persist so refresh re-tests.
  if (isDevForceOpen()) return
  // TODO: persist flag server-side
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
  } catch {
    // localStorage unavailable (private mode) — fail silently.
  }
}

export function TutorialPopup() {
  const reduced = useReducedMotion()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<TutorialStep>(0)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const endedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confettiFired = useRef(false)
  /**
   * True only while the user is actively watching the current video.
   * Ref (not state) so `advance()`'s `setProgress` can't be clobbered by the
   * `timeupdate` that `pause()` queues in the same tick — that stray event was
   * overwriting the "jump this segment to full" value (bar stuck at a low fill).
   */
  const watchingRef = useRef(false)
  /**
   * Progress value from the previous committed render — used as the mount
   * start for each segment's fill tween so Next-jumps (0→33→66→100) and replay
   * resets (100→0) sweep smoothly instead of snapping (CSS transitions don't run
   * on freshly-mounted elements; framer's initial/animate does).
   */
  const prevProgressRef = useRef(0)

  const current = step < STEPS.length ? STEPS[step] : null

  useEffect(() => {
    prevProgressRef.current = progress
  }, [progress])

  const resetToStart = useCallback(() => {
    watchingRef.current = false
    videoRef.current?.pause()
    if (endedTimer.current) {
      clearTimeout(endedTimer.current)
      endedTimer.current = null
    }
    confettiFired.current = false
    setStep(0)
    setProgress(0)
    setStarted(false)
  }, [])

  /** Close + mark as seen (× / ESC / backdrop / Skip / completion CTA). */
  const dismiss = useCallback(() => {
    markTutorialSeen()
    setOpen(false)
    resetToStart()
  }, [resetToStart])

  /** Done CTA: flag as seen first, then take the user to the Lead Feed. */
  const handleDoneCta = useCallback(() => {
    dismiss()
    router.push('/leads')
  }, [dismiss, router])

  // Auto-open ~800ms after mount (flag check is SSR-safe: runs only in this effect).
  useEffect(() => {
    if (!isDevForceOpen() && hasSeenTutorial()) return
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  // ESC handler + body scroll lock while open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, dismiss])

  // Clear any pending "video ended" timer on unmount.
  useEffect(() => {
    return () => {
      if (endedTimer.current) clearTimeout(endedTimer.current)
    }
  }, [])

  // Confetti fires once per entry into the done state.
  useEffect(() => {
    if (step !== STEPS.length || confettiFired.current) return
    confettiFired.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    triggerUnlockConfetti()
  }, [step])

  const startVideo = () => {
    setStarted(true)
    watchingRef.current = true
    const video = videoRef.current
    if (!video) return
    const p = video.play()
    if (p) p.catch(() => undefined) // user gesture allows playback; ignore race
  }

  /** Next → fills the current segment to full, then advances (last video → done). */
  const advance = () => {
    if (step >= STEPS.length) return
    // Stop tracking playback first: pause() queues a timeupdate that would
    // otherwise land after setProgress and overwrite the jumped value.
    watchingRef.current = false
    // Cancel a pending "video ended" beat so Next + ended can't double-advance.
    if (endedTimer.current) {
      clearTimeout(endedTimer.current)
      endedTimer.current = null
    }
    videoRef.current?.pause()
    setStarted(false)
    setProgress(Math.min(100, (step + 1) * SEGMENT))
    setStep((step + 1) as TutorialStep)
  }

  const handleTimeUpdate = () => {
    if (!watchingRef.current) return
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    // Fill within the current third only: step 0 → [0,33.3], 1 → [33.3,66.7], 2 → [66.7,100].
    const frac = video.currentTime / video.duration
    const next = step * SEGMENT + frac * SEGMENT
    setProgress(Math.min(100, Math.max(0, next)))
  }

  const handleEnded = () => {
    if (endedTimer.current) clearTimeout(endedTimer.current)
    endedTimer.current = setTimeout(() => {
      endedTimer.current = null
      advance()
    }, 600)
  }

  /** Replay → back to video 1; does NOT clear the seen flag. */
  const handleReplay = () => {
    resetToStart()
  }

  /**
   * Step-content variants: one shared hidden/show/exit label set driven by
   * the keyed container, with explicit per-child delays (header → hero →
   * text → footer) instead of index-based stagger so the ordering never depends
   * on where children sit in the tree. Each child settles with a slight
   * y + scale + blur lift (~0.3s, expo-out); reduced motion stays opacity-only.
   */
  const stepChild = (delay: number) =>
    reduced
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0.12 } },
          exit: { opacity: 0, transition: { duration: 0.06 } },
        }
      : {
          hidden: { opacity: 0, y: 14, scale: 0.985, filter: 'blur(6px)' },
          show: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: 0.32, ease: EASE_OUT, delay },
          },
          // Parent fades opacity; children only lift away, so there's no double-fade.
          exit: {
            opacity: 0,
            y: -8,
            filter: 'blur(4px)',
            transition: { duration: 0.14, ease: EASE_IN },
          },
        }

  const containerVariants = {
    hidden: {},
    show: {},
    exit: { opacity: 0, transition: { duration: reduced ? 0.06 : 0.1, ease: EASE_IN } },
  }

  /** Progress segments: fade in with the body; width tween lives on each fill. */
  const barVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, delay: reduced ? 0 : 0.08 } },
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Getting started tutorial"
        >
          {/* Backdrop — heavier, saturating vibrancy blur (Apple-style) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-xl backdrop-saturate-150"
            onClick={dismiss}
          />

          {/* Ambient light wash — amber bleeding from the top, a faint mint
              counter-glow low. Decorative; clicks pass through to the backdrop. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-[-18%] h-[52vh] w-[92vw] max-w-4xl -translate-x-1/2 rounded-[50%] bg-primary/[0.16] blur-[110px]" />
            <div className="absolute bottom-[-24%] left-[14%] h-[38vh] w-[65vw] rounded-[50%] bg-accent-mint/[0.06] blur-[100px]" />
          </div>

          {/* Modal Dialog */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-[28px] border border-white/[0.09] bg-surface-container-low/95 px-5 py-4 shadow-[0_40px_100px_-24px_rgba(0,0,0,0.95),0_10px_36px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10),0_0_0_1px_rgba(255,255,255,0.05),0_0_70px_-30px_rgba(var(--rgb-primary),0.45)] backdrop-blur-2xl sm:px-6 sm:py-5"
          >
            {/* Top-edge sheen: the panel reads as lit from above. Decorative;
                the content wrapper below is `relative` so it paints over this. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/[0.05] via-white/[0.015] to-transparent"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial="hidden"
                animate="show"
                exit="exit"
                variants={containerVariants}
                // 3.5 (not 4): the step-2 title wraps to 2 lines — the extra
                // gap would push scrollHeight past the 662px max-h cap.
                className="relative space-y-3.5"
              >
                {/* Header: step counter pill + close (pill hidden on the done state) */}
                <motion.div variants={stepChild(0)} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {current && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary tabular-nums">
                        <span className="text-primary">{String(step + 1).padStart(2, '0')}</span>
                        <span className="text-white/30">/</span>
                        {String(STEPS.length).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={dismiss}
                    title="Close tutorial"
                    aria-label="Close tutorial"
                    className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.05] p-1.5 text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </motion.div>

                {/* Hero: gradient-hairline video frame with an amber outer glow
                    (done state = same geometry check-plate with mint/amber halo) */}
                <motion.div
                  variants={stepChild(0.05)}
                  className="rounded-[17px] bg-gradient-to-b from-primary/45 via-white/[0.14] to-white/[0.06] p-px shadow-[0_28px_70px_-34px_rgba(var(--rgb-primary),0.6),0_14px_44px_-22px_rgba(0,0,0,0.9)]"
                >
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
                    {current ? (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover"
                          src={current.src}
                          poster={current.poster}
                          playsInline
                          preload="metadata"
                          controls={started}
                          aria-label={`Tutorial video: ${current.title}`}
                          onTimeUpdate={handleTimeUpdate}
                          onEnded={handleEnded}
                        />
                        {!started && (
                          <button
                            type="button"
                            onClick={startVideo}
                            aria-label={`Play video: ${current.title}`}
                            className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none"
                          >
                            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/45 text-primary shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_36px_rgba(var(--rgb-primary),0.28)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-white">
                              {!reduced && (
                                /* Idle pulse ring — decorative, pauses with reduced motion. */
                                <motion.span
                                  aria-hidden="true"
                                  className="absolute inset-0 rounded-full border border-primary/60"
                                  initial={{ scale: 1, opacity: 0.65 }}
                                  animate={{ scale: 1.5, opacity: 0 }}
                                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                                />
                              )}
                              <PlayIcon className="relative w-7 h-7 translate-x-[1px]" />
                            </span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div aria-hidden="true" className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--rgb-primary),0.18),transparent_65%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--rgb-secondary),0.10),transparent_78%)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Soft mint halo behind the amber check disc */}
                          <span className="absolute h-24 w-24 rounded-full bg-accent-mint/25 blur-2xl" />
                          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-black shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_50px_rgba(var(--rgb-primary),0.5)] ring-1 ring-white/25">
                            <CheckIcon className="w-7 h-7" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Text block: big question title + small supporting blurb */}
                <motion.div variants={stepChild(0.1)} className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.15] text-white text-balance">
                    {current ? current.title : "You're all set."}
                  </h2>
                  <p className="max-w-[50ch] text-sm leading-relaxed text-text-secondary">
                    {current
                      ? current.blurb
                      : 'You have 50 free credits — reveal your first lead now.'}
                  </p>
                </motion.div>

                {/* 3-segment progress: watch-driven third per video (see handleTimeUpdate) */}
                <motion.div
                  variants={barVariants}
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-label="Tutorial progress"
                >
                  {STEPS.map((s, i) => {
                    // Shimmer while this segment's video is actively playing.
                    const playingHere = Boolean(current) && i === step && started && !reduced
                    return (
                      <div
                        key={s.id}
                        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/[0.06]"
                      >
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_10px_rgba(var(--rgb-primary),0.5)]"
                          initial={{ width: `${segmentFill(prevProgressRef.current, i)}%` }}
                          animate={{ width: `${segmentFill(progress, i)}%` }}
                          transition={
                            reduced
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 170, damping: 24, mass: 0.5 }
                          }
                        />
                        {playingHere && (
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                            initial={{ x: '-130%' }}
                            animate={{ x: '430%' }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </motion.div>

                {/* Progress + footer share a tighter rhythm than the blocks above. */}
                <div className="space-y-2.5">
                  {/* Footer */}
                  {current ? (
                    <motion.div variants={stepChild(0.15)} className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={dismiss}
                        className="rounded-full px-4 py-2 -mx-1 text-sm text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        Skip for now
                      </button>
                      <button
                        type="button"
                        onClick={advance}
                        className="shrink-0 rounded-full bg-gradient-to-b from-badge-amber to-primary px-6 py-2.5 text-sm font-bold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_18px_rgba(var(--rgb-primary),0.3)] transition-all duration-200 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_24px_rgba(var(--rgb-primary),0.4)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {step === STEPS.length - 1 ? 'Start finding leads →' : 'Next →'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div variants={stepChild(0.15)} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handleDoneCta}
                        className="w-full rounded-full bg-gradient-to-b from-badge-amber to-primary py-3.5 text-sm font-bold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_24px_rgba(var(--rgb-primary),0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_rgba(var(--rgb-primary),0.45)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        Start finding leads →
                      </button>
                      <button
                        type="button"
                        onClick={handleReplay}
                        className="w-full rounded-full py-2.5 text-sm text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        Replay videos
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
