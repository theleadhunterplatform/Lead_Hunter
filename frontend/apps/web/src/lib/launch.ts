// The launch gate - single switch for the whole coming-soon experience.
// true  -> `/` serves ComingSoon.tsx (video page, single "Create your account" CTA)
// false -> `/` serves the real hero landing page again
// Flip this one value, commit, deploy. That's it.
export const COMING_SOON = false
