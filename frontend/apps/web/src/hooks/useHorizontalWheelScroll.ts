import { useCallback, useEffect, useRef } from 'react'

/**
 * useHorizontalWheelScroll
 * Lets a horizontal overflow strip (niche pill rows, tab bars) be scrolled
 * with a normal vertical mouse wheel. Without this, vertical wheel input
 * bubbles past the strip and scrolls the page instead — only trackpad
 * horizontal swipes reach it, so mouse users can't scroll it at all.
 *
 * Trackpads already emit real horizontal deltas, so those (and Shift+wheel)
 * are left to native scrolling. The event is consumed ONLY while the strip
 * can actually move in the wheel direction — at either edge it flows through,
 * so the page (and Lenis smooth-scroll) keeps working.
 *
 * NOTE: a native non-passive listener is required — React attaches wheel
 * handlers as passive, so preventDefault() inside onWheel would warn.
 *
 * Implemented as a callback ref (not useEffect-on-mount) so it also attaches
 * when the strip appears late — e.g. behind a `if (loading) return ...` gate,
 * where a mount-time effect would see `ref.current === null` and never retry.
 */
export function useHorizontalWheelScroll<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null)

  const detach = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  const ref = useCallback(
    (node: T | null) => {
      detach()
      if (!node) return

      const onWheel = (e: WheelEvent) => {
        // Horizontal intent (trackpad swipe, Shift+wheel) → native handles it
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

        const maxScroll = node.scrollWidth - node.clientWidth
        if (maxScroll <= 0) return

        // Normalize to pixels (Firefox may report lines or pages)
        let delta = e.deltaY
        if (e.deltaMode === 1) delta *= 16
        else if (e.deltaMode === 2) delta *= node.clientHeight
        if (delta === 0) return

        const atStart = node.scrollLeft <= 0
        const atEnd = node.scrollLeft >= maxScroll - 1
        // At an edge: let the page scroll instead
        if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return

        e.preventDefault()
        e.stopPropagation()
        node.scrollLeft += delta
      }

      node.addEventListener('wheel', onWheel, { passive: false })
      cleanupRef.current = () => node.removeEventListener('wheel', onWheel)
    },
    [detach],
  )

  // Safety net for unmount (React normally calls the ref with null first)
  useEffect(() => () => detach(), [detach])

  return ref
}
