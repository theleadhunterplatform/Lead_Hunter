'use client'

/**
 * OnboardingPet — hunter-pup companion for /onboarding.
 * Thin brain over the generic PupCompanion engine: translates the page's
 * existing form state into a playful-pet hint via pickHint().
 */

import { useState } from 'react'
import PupCompanion from '@/components/pup/PupCompanion'
import { pickHint, type GuideStatus } from './guideCopy'

export default function OnboardingPet({ status }: { status: GuideStatus }) {
  const [focused, setFocused] = useState<string | null>(null)
  const hint = pickHint({ ...status, focused: focused ?? status.focused ?? null })

  return (
    <PupCompanion
      mood={hint.mood}
      title={hint.title}
      sub={hint.sub}
      defaultAnchor={`cta-${status.step}`}
      onFocusedChange={setFocused}
    />
  )
}
