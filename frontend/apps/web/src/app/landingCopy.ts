/**
 * Landing-page hint script for the hunter pup (same playful pet voice as
 * onboarding). Pure function of landing signals — unit-testable in isolation.
 *
 * Coverage: every tracked section gets a first-sighting line; hero / funnel /
 * pricing / final get a second-sighting comeback; third sightings go quiet
 * (pet just watches). CTA hovers alternate two nudges by hit count so repeat
 * hovers don't feel robotic. All copy stays consistent with site truth
 * (50 free credits, no card; ₹999 ≈ 100+ reveals; reveals run 5–15 coins).
 */

import type { PupHint } from '@/components/pup/PupCompanion'

export type LandingSection =
  | 'hero'
  | 'funnel'
  | 'philosophy'
  | 'features'
  | 'tokens'
  | 'testimonials'
  | 'who'
  | 'pricing'
  | 'faq'
  | 'final'
  | 'unknown'

export interface LandingStatus {
  section: LandingSection
  /** How many times this section has become active (1 = first sighting). */
  seenCount: number
  /** Cursor is over (or keyboard focus in) a CTA. */
  ctaHover: boolean
  /** How many separate times a CTA has been hovered/focused. */
  ctaHits: number
}

export function pickLandingHint(s: LandingStatus): PupHint | null {
  if (s.ctaHover) {
    return s.ctaHits % 2 === 0
      ? { title: 'no, really', sub: '30 seconds. free.', mood: 'listening' }
      : { title: 'go on, click it', sub: 'takes 30 seconds', mood: 'listening' }
  }

  const second = s.seenCount === 2
  switch (s.section) {
    case 'hero':
      if (s.seenCount > 2) return null
      return second
        ? { title: 'still thinking?', sub: 'still free, still 50 credits', mood: 'idle' }
        : { title: 'psst — hunters start free', sub: '50 credits, no card. just saying', mood: 'online' }
    case 'funnel':
      if (s.seenCount > 2) return null
      return second
        ? { title: 'told you. live demand.', sub: 'keep scrolling, closer', mood: 'idle' }
        : { title: "that's real buyer intent btw", sub: 'not scraped lists. live demand', mood: 'idle' }
    case 'philosophy':
      if (s.seenCount > 1) return null
      return { title: 'contacts are cheap', sub: 'context is the whole game', mood: 'idle' }
    case 'features':
      if (s.seenCount > 1) return null
      return { title: 'this is the arsenal', sub: "hover around, it's all live", mood: 'idle' }
    case 'tokens':
      if (s.seenCount > 1) return null
      return { title: 'wolf coins 101', sub: 'reveals run 5–15 coins', mood: 'idle' }
    case 'testimonials':
      if (s.seenCount > 1) return null
      return { title: 'the wall of love', sub: 'real hunters. real closes', mood: 'idle' }
    case 'who':
      if (s.seenCount > 1) return null
      return { title: 'which one are you?', sub: 'find yourself in the grid', mood: 'idle' }
    case 'pricing':
      if (s.seenCount > 2) return null
      return second
        ? { title: 'do the maths', sub: 'yeah. ~100+ reveals', mood: 'idle' }
        : { title: 'quick maths:', sub: '₹999 ≈ 100+ reveals', mood: 'idle' }
    case 'faq':
      if (s.seenCount > 1) return null
      return { title: 'questions? good.', sub: 'spoiler: start free, no card', mood: 'idle' }
    case 'final':
      if (s.seenCount > 2) return null
      return second
        ? { title: 'ok, final push', sub: 'start hunting free →', mood: 'online' }
        : {
            title: 'last chance to stop cold-calling',
            sub: 'start hunting free →',
            mood: 'online',
          }
    default:
      return null
  }
}
