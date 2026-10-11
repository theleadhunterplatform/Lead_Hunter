/**
 * Onboarding pet hint script (playful pet voice: lowercase, terse, cute).
 * Pure function of the page's existing state — no DOM, no side effects,
 * so the copy and the selection logic are unit-testable in isolation.
 */

export type GuideStep = 1 | 2 | 3
export type GuideMood = 'idle' | 'listening' | 'thinking' | 'online'

export interface GuideStatus {
  step: GuideStep
  /** data-guide-anchor id of the focused field, or null */
  focused: string | null
  linkedin: string
  linkedinOk: boolean
  phone: string
  phoneOk: boolean
  step1Error: string
  servicesCount: number
  nichesCount: number
  hasExperience: boolean
  canProceedFromStep2: boolean
  discoverySource: string
  discoveryOther: string
  canSubmit: boolean
  submitError: string
  isSubmitting: boolean
}

export interface GuideHint {
  title: string
  sub: string
  mood: GuideMood
}

/** First match wins — ordered from most urgent to least. */
export function pickHint(s: GuideStatus): GuideHint {
  if (s.isSubmitting) {
    return { title: 'sending your application…', sub: 'hold tight, almost a hunter', mood: 'thinking' }
  }
  if (s.submitError) {
    return { title: "oof, that didn't go through", sub: s.submitError, mood: 'thinking' }
  }

  if (s.step === 1) {
    if (s.step1Error) {
      if (/linkedin/i.test(s.step1Error)) {
        return { title: 'ooh, that link looks off…', sub: 'i need linkedin.com/in/yourname', mood: 'thinking' }
      }
      if (/phone|number|digit|otp/i.test(s.step1Error)) {
        return { title: "that number won't ring…", sub: 'double-check the digits?', mood: 'thinking' }
      }
      return { title: "hmm, something's off", sub: s.step1Error, mood: 'thinking' }
    }
    if (s.focused === 'linkedin') {
      return { title: 'linkedin goes here', sub: "it's how i know you're real", mood: 'listening' }
    }
    if (s.focused === 'phone') {
      return { title: 'phone number here', sub: 'so we can reach you', mood: 'listening' }
    }
    if (s.focused === 'social') {
      return { title: 'ooh, bonus points', sub: 'totally optional, but shiny', mood: 'listening' }
    }
    if (s.linkedinOk && s.phoneOk) {
      return { title: 'ooh, looking sharp', sub: 'hit Continue →', mood: 'online' }
    }
    if (!s.linkedin.trim()) {
      return { title: "let's get you hunting", sub: 'paste your LinkedIn URL first', mood: 'idle' }
    }
    if (!s.linkedinOk) {
      return { title: 'almost…', sub: 'that LinkedIn needs a second look', mood: 'idle' }
    }
    return { title: 'one more thing', sub: 'drop your phone number below', mood: 'idle' }
  }

  if (s.step === 2) {
    if (s.focused === 'services') {
      return { title: 'what do you sell?', sub: 'pick at least one', mood: 'listening' }
    }
    if (s.focused === 'niches') {
      return { title: 'who do you sell to?', sub: 'pick a lead category', mood: 'listening' }
    }
    if (s.focused === 'experience') {
      return { title: 'how seasoned are you?', sub: 'pick one, no wrong answers', mood: 'listening' }
    }
    if (s.canProceedFromStep2) {
      return { title: 'locked in', sub: 'Continue →', mood: 'online' }
    }
    if (s.servicesCount === 0) {
      return { title: 'what do you sell?', sub: 'tap at least one service', mood: 'idle' }
    }
    if (s.nichesCount === 0) {
      return { title: 'who do you hunt?', sub: 'pick a lead category', mood: 'idle' }
    }
    return { title: 'one last pick', sub: 'choose your experience', mood: 'idle' }
  }

  // Step 3 — discovery + submit.
  if (s.focused === 'discoveryOther') {
    return { title: 'spill it', sub: 'a reel? a friend? name it', mood: 'listening' }
  }
  if (s.focused === 'discovery') {
    return { title: "where'd you find us?", sub: 'tap one', mood: 'listening' }
  }
  if (!s.discoverySource) {
    return { title: 'last one, promise', sub: 'how did you find us?', mood: 'idle' }
  }
  if (s.discoverySource === 'Other' && !s.discoveryOther.trim()) {
    return { title: "don't leave me hanging", sub: 'type where you found us', mood: 'idle' }
  }
  return { title: 'all set', sub: 'smash Submit Application', mood: 'online' }
}
