'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalMenuProps {
  open: boolean
  onClose: () => void
  /** Trigger button the menu is anchored to (single currently-open trigger). */
  anchorRef: React.RefObject<HTMLElement | null>
  /** Menu width in px (clamped to the viewport). */
  width: number
  /** Horizontal alignment relative to the trigger. */
  align?: 'left' | 'right'
  /** Initial assumed menu height before the real one is measured (flip hint). */
  estimatedHeight?: number
  /** Extra classes for the menu surface. */
  className?: string
  children: React.ReactNode
}

const GAP = 8
const EDGE = 8

/**
 * Dropdown menu rendered through a portal on document.body with fixed
 * positioning, so it can never be clipped by `overflow` ancestors
 * (e.g. the admin layout's `main.overflow-y-auto` scroll container).
 *
 * - Measures the real menu height after render, then picks the vertical
 *   placement (below / above / clamped) that actually fits the viewport
 * - Clamps horizontally to the viewport
 * - Closes on outside pointerdown, Escape, scroll (capture) and resize
 *   (same behavior as the saved-leads action menu)
 */
export function PortalMenu({
  open,
  onClose,
  anchorRef,
  width,
  align = 'left',
  estimatedHeight = 200,
  className = '',
  children,
}: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Pass A — place with the estimate (menu not in the DOM yet).
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const left = Math.max(
      EDGE,
      Math.min(
        align === 'right' ? rect.right - width : rect.left,
        window.innerWidth - width - EDGE,
      ),
    )
    const openUp = window.innerHeight - rect.bottom < estimatedHeight + GAP
    const top = openUp ? Math.max(EDGE, rect.top - estimatedHeight - GAP) : rect.bottom + GAP
    setPos({ top, left })
  }, [open, anchorRef, align, width, estimatedHeight])

  // Pass B — measure the real height (layout effect runs before paint, so
  // the correction is never visible) and pick a placement that fits.
  useLayoutEffect(() => {
    if (!open || !pos) return
    const el = anchorRef.current
    const menu = menuRef.current
    if (!el || !menu) return
    const rect = el.getBoundingClientRect()
    const h = menu.offsetHeight
    const downTop = rect.bottom + GAP
    const upTop = rect.top - h - GAP
    let top: number
    if (downTop + h <= window.innerHeight - EDGE) {
      top = downTop
    } else if (upTop >= EDGE) {
      top = upTop
    } else {
      // Neither side fits fully — clamp into the viewport.
      top = Math.max(EDGE, Math.min(upTop, window.innerHeight - h - EDGE))
    }
    if (top !== pos.top) setPos({ ...pos, top })
  }, [open, pos, anchorRef])

  // Close on outside interaction, Escape and scroll/resize (matches saved page).
  useLayoutEffect(() => {
    if (!open) return
    const close = () => {
      setPos(null)
      onClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, anchorRef, onClose])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 60 }}
      className={`bg-surface-elevated border border-white/[0.08] rounded-xl shadow-xl overflow-hidden ${className}`}
    >
      {children}
    </div>,
    document.body,
  )
}
