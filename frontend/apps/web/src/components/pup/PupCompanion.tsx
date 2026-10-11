'use client'

/**
 * PupCompanion — generic floating wolf-orb companion engine.
 *
 * Free-floating overlay pet (never a dock or chat box): watches the global
 * cursor with its gaze, glides beside focused/anchored elements, trails the
 * cursor otherwise, and talks through an auto-flipping speech bubble.
 * Page-specific brains (what to say, default anchors) live in thin wrappers
 * like OnboardingPet / LandingPet — this file owns only movement + chrome.
 *
 * Root is pointer-events-none (never blocks taps); only the mute button
 * takes pointer events. Mute persists in localStorage.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import { X } from 'lucide-react'
import { WolfOrb, type WolfOrbState } from '@/components/chat/WolfOrb'

export interface PupHint {
  title: string
  sub: string
  mood: WolfOrbState
}

interface PupCompanionProps {
  mood: WolfOrbState
  title: string
  sub: string
  /** data-guide-anchor id to sit beside when nothing is focused. Null = trail. */
  defaultAnchor: string | null
  /** Hide the speech bubble (pet keeps floating and watching). */
  quiet?: boolean
  /** Desktop home corner. Mobile always parks top-right. Default 'right'. */
  homeCorner?: 'left' | 'right'
  /** Render nothing (e.g. while the copilot chat is open). */
  hidden?: boolean
  onFocusedChange?: (anchor: string | null) => void
}

const MUTE_KEY = 'lh_guide_muted'
const PET_DESKTOP = 56
const PET_MOBILE = 40

type BubbleSide = { h: 'left' | 'right'; v: 'up' | 'down' }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function PupCompanion({
  mood,
  title,
  sub,
  defaultAnchor,
  homeCorner = 'right',
  hidden = false,
  quiet = false,
  onFocusedChange,
}: PupCompanionProps) {
  const reduceMotion = useReducedMotion()
  const [muted, setMuted] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === '1',
  )
  const [isMobile, setIsMobile] = useState(false)
  const [side, setSide] = useState<BubbleSide>({ h: 'right', v: 'up' })

  const cursor = useRef<{ x: number; y: number } | null>(null)
  const focusedRef = useRef<string | null>(null)
  const defaultAnchorRef = useRef(defaultAnchor)
  defaultAnchorRef.current = defaultAnchor
  const homeCornerRef = useRef(homeCorner)
  homeCornerRef.current = homeCorner
  const onFocusedChangeRef = useRef(onFocusedChange)
  onFocusedChangeRef.current = onFocusedChange
  const modeRef = useRef({ mobile: false, reduced: false, fine: false })
  const sideRef = useRef<BubbleSide>({ h: 'right', v: 'up' })
  const rafRef = useRef(0)

  // Pet position (springs follow imperative targets — no re-render per move).
  const tx = useMotionValue(0)
  const ty = useMotionValue(0)
  const px = useSpring(tx, { stiffness: 130, damping: 17, mass: 0.6 })
  const py = useSpring(ty, { stiffness: 130, damping: 17, mass: 0.6 })

  // Gaze (global cursor, normalized). WolfOrb springs these internally.
  const gx = useMotionValue(0)
  const gy = useMotionValue(0)

  const petSize = isMobile ? PET_MOBILE : PET_DESKTOP

  const setSideIfChanged = useCallback((next: BubbleSide) => {
    const prev = sideRef.current
    if (prev.h !== next.h || prev.v !== next.v) {
      sideRef.current = next
      setSide(next)
    }
  }, [])

  const computeTarget = useCallback(() => {
    if (typeof window === 'undefined') return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const { mobile, reduced, fine } = modeRef.current
    const half = (mobile ? PET_MOBILE : PET_DESKTOP) / 2
    const homeRight = homeCornerRef.current === 'right'

    const home = () => {
      const x = mobile ? vw - 52 : homeRight ? vw - 84 : 84
      const y = mobile ? 132 : vh - 140
      tx.set(x)
      ty.set(y)
      const hSide = mobile || homeRight ? 'left' : 'right'
      setSideIfChanged({ h: hSide, v: y < vh * 0.35 ? 'down' : 'up' })
    }

    if (reduced || mobile) {
      // Parked companion: anchor beside the focused field when it fits,
      // otherwise the home corner. Never trails.
      const anchorId = focusedRef.current ?? defaultAnchorRef.current
      const el = anchorId ? document.querySelector(`[data-guide-anchor="${anchorId}"]`) : null
      const r = el?.getBoundingClientRect()
      if (!reduced && r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh) {
        const y = clamp(r.top + r.height / 2, 120, vh - 120)
        const x = vw - 52
        tx.set(x)
        ty.set(y)
        setSideIfChanged({ h: 'left', v: y < vh * 0.35 ? 'down' : 'up' })
        return
      }
      home()
      return
    }

    // Desktop: anchor first, trail cursor otherwise.
    const anchorId = focusedRef.current ?? defaultAnchorRef.current
    const el = anchorId ? document.querySelector(`[data-guide-anchor="${anchorId}"]`) : null
    const r = el?.getBoundingClientRect()
    if (r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh) {
      const y = clamp(r.top + r.height / 2, 100, vh - 100)
      const spaceRight = vw - r.right
      const spaceLeft = r.left
      let x: number
      if (spaceRight >= 260) x = r.right + 28 + half
      else if (spaceLeft >= 260) x = r.left - 28 - half
      else x = clamp(r.left + r.width / 2, 110, vw - 110)
      const yClamped = spaceRight >= 260 || spaceLeft >= 260 ? y : clamp(r.top - 24 - half, 100, vh - 100)
      tx.set(x)
      ty.set(yClamped)
      setSideIfChanged({ h: x > vw * 0.55 ? 'left' : 'right', v: yClamped < vh * 0.35 ? 'down' : 'up' })
      return
    }

    if (fine && cursor.current) {
      const x = clamp(cursor.current.x + 64, 110, vw - 110)
      const y = clamp(cursor.current.y - 84, 110, vh - 110)
      tx.set(x)
      ty.set(y)
      setSideIfChanged({ h: x > vw * 0.55 ? 'left' : 'right', v: y < vh * 0.35 ? 'down' : 'up' })
      return
    }

    home()
  }, [setSideIfChanged, tx, ty])

  const scheduleCompute = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(computeTarget)
  }, [computeTarget])

  // Environment + global listeners (effect-clean for StrictMode double-mount).
  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 639px)')
    const mqFine = window.matchMedia('(pointer: fine)')
    const syncEnv = () => {
      modeRef.current = {
        mobile: mqMobile.matches,
        reduced: !!reduceMotion,
        fine: mqFine.matches,
      }
      setIsMobile(mqMobile.matches)
    }
    syncEnv()
    mqMobile.addEventListener('change', syncEnv)
    mqFine.addEventListener('change', syncEnv)

    const onPointerMove = (e: PointerEvent) => {
      cursor.current = { x: e.clientX, y: e.clientY }
      const vw = window.innerWidth
      const vh = window.innerHeight
      gx.set(clamp(e.clientX / vw - 0.5, -0.5, 0.5))
      gy.set(clamp(e.clientY / vh - 0.5, -0.5, 0.5))
      if (!focusedRef.current && modeRef.current.fine && !modeRef.current.reduced) {
        scheduleCompute()
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      const anchor = t?.closest?.('[data-guide-anchor]')?.getAttribute('data-guide-anchor')
      focusedRef.current = anchor ?? null
      onFocusedChangeRef.current?.(anchor ?? null)
      scheduleCompute()
    }
    const onFocusOut = () => {
      // Delay: focus may move between anchored fields.
      window.setTimeout(() => {
        if (!document.activeElement?.closest?.('[data-guide-anchor]')) {
          focusedRef.current = null
          onFocusedChangeRef.current?.(null)
          scheduleCompute()
        }
      }, 0)
    }
    const onScroll = () => scheduleCompute()

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)

    // Fly-in from the home corner on mount.
    const homeRight = homeCornerRef.current === 'right'
    tx.set(mqMobile.matches ? window.innerWidth - 52 : homeRight ? window.innerWidth - 84 : 84)
    ty.set(mqMobile.matches ? 132 : window.innerHeight - 140)
    scheduleCompute()

    return () => {
      cancelAnimationFrame(rafRef.current)
      mqMobile.removeEventListener('change', syncEnv)
      mqFine.removeEventListener('change', syncEnv)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [gx, gy, reduceMotion, scheduleCompute, tx, ty])

  // Re-target when the default anchor changes (e.g. step transitions).
  useEffect(() => {
    const id = requestAnimationFrame(() => computeTarget())
    return () => cancelAnimationFrame(id)
  }, [defaultAnchor, computeTarget])

  // Celebration bounce when mood flips to online.
  const bounce = useAnimation()
  const prevMood = useRef<WolfOrbState>(mood)
  useEffect(() => {
    if (prevMood.current !== 'online' && mood === 'online' && !reduceMotion) {
      bounce.start({ scale: [1, 1.15, 1], transition: { duration: 0.5, ease: 'easeOut' } })
    }
    prevMood.current = mood
  }, [mood, bounce, reduceMotion])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        if (next) window.localStorage.setItem(MUTE_KEY, '1')
        else window.localStorage.removeItem(MUTE_KEY)
      } catch {
        /* storage unavailable — mute lasts for the session */
      }
      return next
    })
  }, [])

  if (hidden) return null

  if (muted) {
    return (
      <button
        onClick={toggleMute}
        title="Bring back the hunter pup"
        aria-label="Show guide pup"
        className="fixed bottom-5 right-5 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-surface-container/95 shadow-elevation-4 backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
      >
        <WolfOrb size="xxs" state="idle" showRing={false} showStatus={false} trackPointer={false} />
      </button>
    )
  }

  const bubblePos = side.h === 'right' ? 'left-[calc(100%+12px)]' : 'right-[calc(100%+12px)]'

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-40" role="img" aria-label="Hunter pup guide">
      <motion.div style={{ x: reduceMotion ? undefined : px, y: reduceMotion ? undefined : py }}>
        <div
          className="relative"
          style={
            reduceMotion
              ? { position: 'fixed', right: 20, bottom: 88 }
              : { transform: 'translate(-50%, -50%)', width: petSize, height: petSize }
          }
        >
          <motion.div animate={bounce} className="relative" style={{ width: petSize, height: petSize }}>
            <WolfOrb
              size={isMobile ? 'xs' : 'sm'}
              state={mood}
              gaze={reduceMotion ? undefined : { x: gx, y: gy }}
              trackPointer={false}
              showStatus={false}
              ariaLabel="Hunter pup watching your progress"
            />
          </motion.div>

          {/* Speech bubble attached to the pet */}
          {!quiet && (
          <div
            className={`absolute w-max max-w-[210px] ${bubblePos} ${
              side.v === 'up' ? 'top-1/2 -translate-y-1/2' : 'top-[calc(100%+12px)]'
            }`}
          >
            <div className="relative rounded-2xl border border-white/10 bg-black/85 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <AnimatePresence mode="wait">
                {reduceMotion ? (
                  <div key={title}>
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{sub}</p>
                  </div>
                ) : (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{sub}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={toggleMute}
                title="Hide the pup"
                aria-label="Hide guide pup"
                className="pointer-events-auto absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-surface-container text-text-secondary transition-colors hover:text-white"
              >
                <X size={11} />
              </button>
            </div>
          </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
