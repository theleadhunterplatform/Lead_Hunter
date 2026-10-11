import { describe, expect, it } from 'vitest'
import { pickLandingHint, type LandingSection, type LandingStatus } from './landingCopy'

const base: LandingStatus = { section: 'unknown', seenCount: 1, ctaHover: false, ctaHits: 0 }

describe('pickLandingHint', () => {
  it('greets on first hero sighting, comebacks once, then quiet', () => {
    const first = pickLandingHint({ ...base, section: 'hero' })
    expect(first?.title).toMatch(/hunters start free/)
    expect(first?.mood).toBe('online')
    const second = pickLandingHint({ ...base, section: 'hero', seenCount: 2 })
    expect(second?.title).toMatch(/still thinking/)
    expect(pickLandingHint({ ...base, section: 'hero', seenCount: 3 })).toBeNull()
  })

  it('cta hover alternates two nudges by hit count', () => {
    const odd = pickLandingHint({ ...base, section: 'pricing', ctaHover: true, ctaHits: 1 })
    expect(odd?.title).toMatch(/go on/)
    expect(odd?.mood).toBe('listening')
    const even = pickLandingHint({ ...base, section: 'pricing', ctaHover: true, ctaHits: 2 })
    expect(even?.title).toMatch(/no, really/)
  })

  it('narrates funnel, pricing, final with second-sighting comebacks', () => {
    expect(pickLandingHint({ ...base, section: 'funnel' })?.sub).toMatch(/live demand/)
    expect(pickLandingHint({ ...base, section: 'funnel', seenCount: 2 })?.title).toMatch(/told you/)
    expect(pickLandingHint({ ...base, section: 'pricing' })?.sub).toMatch(/100\+ reveals/)
    expect(pickLandingHint({ ...base, section: 'pricing', seenCount: 2 })?.title).toMatch(/do the maths/)
    expect(pickLandingHint({ ...base, section: 'final' })?.mood).toBe('online')
    expect(pickLandingHint({ ...base, section: 'final', seenCount: 3 })).toBeNull()
  })

  it('covers every supporting section once, then quiet', () => {
    const firsts: { section: LandingSection; re: RegExp }[] = [
      { section: 'philosophy', re: /contacts are cheap/ },
      { section: 'features', re: /arsenal/ },
      { section: 'tokens', re: /wolf coins/ },
      { section: 'testimonials', re: /wall of love/ },
      { section: 'who', re: /which one are you/ },
      { section: 'faq', re: /questions\? good/ },
    ]
    for (const { section, re } of firsts) {
      expect(pickLandingHint({ ...base, section })?.title).toMatch(re)
    }
    expect(pickLandingHint({ ...base, section: 'tokens', seenCount: 2 })).toBeNull()
    expect(pickLandingHint(base)).toBeNull()
  })
})
