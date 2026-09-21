import confetti from 'canvas-confetti'

/**
 * Triggers a celebratory confetti explosion when a lead contact is unlocked.
 * Guaranteed to fire visible, vibrant confetti even if coordinates are missing, undefined, or zero.
 */
export function triggerUnlockConfetti(coords?: { x?: number; y?: number } | null) {
  if (typeof window === 'undefined') return

  let originX = 0.5
  let originY = 0.55

  if (coords && typeof coords.x === 'number' && Number.isFinite(coords.x) && coords.x > 0 && window.innerWidth > 0) {
    originX = Math.max(0.1, Math.min(0.9, coords.x / window.innerWidth))
  }
  if (coords && typeof coords.y === 'number' && Number.isFinite(coords.y) && coords.y > 0 && window.innerHeight > 0) {
    originY = Math.max(0.1, Math.min(0.9, coords.y / window.innerHeight))
  }

  const pastelColors = [
    '#B8F36B', // mint
    '#A78BFA', // purple
    '#F9A8D4', // pink
    '#7DD3FC', // cyan
    '#FFB86B', // orange
    '#FDE047', // gold yellow
    '#38BDF8', // sky blue
    '#FFFFFF', // sparkling white
  ]

  try {
    // 1. Immediate crisp explosion from the button or center
    confetti({
      particleCount: 85,
      spread: 85,
      startVelocity: 45,
      origin: { x: originX, y: originY },
      colors: pastelColors,
      ticks: 240,
      gravity: 0.95,
      scalar: 1.2,
      zIndex: 999999,
    })

    // 2. Dual celebratory side-cannons firing inward across the screen
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          startVelocity: 55,
          origin: { x: 0, y: 0.75 },
          colors: pastelColors,
          zIndex: 999999,
        })
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          startVelocity: 55,
          origin: { x: 1, y: 0.75 },
          colors: pastelColors,
          zIndex: 999999,
        })
      } catch (err) {
        console.warn('Secondary confetti error:', err)
      }
    }, 120)
  } catch (err) {
    console.warn('Primary confetti error:', err)
  }
}
