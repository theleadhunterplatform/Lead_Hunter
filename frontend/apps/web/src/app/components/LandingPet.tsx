'use client'

/**
 * LandingPet — hunter-pup companion for the marketing landing page.
 * Thin brain over the generic PupCompanion engine: watches which section is
 * in view (IntersectionObserver), CTA hover/focus, and per-section visit
 * counts, then picks a one-time nudge via pickLandingHint(). Quiet sections
 * render the pet bubble-free — it just watches.
 *
 * Hides entirely while the copilot chat window is open (two talking wolves
 * is chaos). Mounts ~4.5s after load so the hero's staged intro plays first.
 */

import { useEffect, useRef, useState } from 'react'
import PupCompanion from '@/components/pup/PupCompanion'
import { useCopilot } from '@/lib/copilot-store'
import { pickLandingHint, type LandingSection } from '../landingCopy'

const CANDIDATES: { key: LandingSection; sel: string }[] = [
  { key: 'hero', sel: '[data-landing-section="hero"]' },
  { key: 'funnel', sel: '[data-landing-section="funnel"]' },
  { key: 'philosophy', sel: '[data-landing-section="philosophy"]' },
  { key: 'features', sel: '#features' },
  { key: 'tokens', sel: '#tokens' },
  { key: 'testimonials', sel: '#testimonials' },
  { key: 'who', sel: '#who' },
  { key: 'pricing', sel: '[data-landing-section="pricing"]' },
  { key: 'faq', sel: '[data-landing-section="faq"]' },
  { key: 'final', sel: '[data-landing-section="final"]' },
]

const SECTION_ANCHOR: Partial<Record<LandingSection, string>> = {
  hero: 'cta-hero',
  pricing: 'cta-pricing',
  final: 'cta-final',
}

export default function LandingPet() {
  const { open: copilotOpen, minimized } = useCopilot()
  const [ready, setReady] = useState(false)
  const [sig, setSig] = useState<{ section: LandingSection; seen: number }>({
    section: 'hero',
    seen: 1,
  })
  const [cta, setCta] = useState({ hover: false, hits: 0 })
  const seenRef = useRef<Record<string, number>>({ hero: 1 })

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 4500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const targets = CANDIDATES.flatMap((c) => {
      const el = document.querySelector(c.sel)
      return el ? [{ key: c.key, el }] : []
    })
    if (!targets.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue
          const found = targets.find((t) => t.el === en.target)
          if (!found) continue
          const n = (seenRef.current[found.key] ?? 0) + 1
          seenRef.current[found.key] = n
          setSig({ section: found.key, seen: n })
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    targets.forEach((t) => io.observe(t.el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const isCta = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('[data-guide-anchor]')
    const engage = () =>
      setCta((prev) => (prev.hover ? prev : { hover: true, hits: prev.hits + 1 }))
    const disengage = () => setCta((prev) => (prev.hover ? { ...prev, hover: false } : prev))
    const onOver = (e: MouseEvent) => {
      if (isCta(e.target)) engage()
    }
    const onOut = (e: MouseEvent) => {
      const to = (e as FocusEvent).relatedTarget as HTMLElement | null
      if (!to?.closest?.('[data-guide-anchor]')) disengage()
    }
    const onFocusIn = (e: FocusEvent) => {
      if (isCta(e.target)) engage()
    }
    const onFocusOut = () => window.setTimeout(() => disengage(), 0)
    window.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('mouseout', onOut, { passive: true })
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout', onOut)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  if (!ready) return null

  const hint = pickLandingHint({ section: sig.section, seenCount: sig.seen, ctaHover: cta.hover, ctaHits: cta.hits })

  return (
    <PupCompanion
      mood={hint?.mood ?? 'idle'}
      title={hint?.title ?? ''}
      sub={hint?.sub ?? ''}
      quiet={!hint}
      defaultAnchor={SECTION_ANCHOR[sig.section] ?? null}
      homeCorner="left"
      hidden={copilotOpen && !minimized}
    />
  )
}
