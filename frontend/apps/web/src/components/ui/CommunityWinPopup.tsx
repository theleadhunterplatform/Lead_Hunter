'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  SparklesIcon,
  TrophyIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/solid'

export interface CommunityPopupPost {
  id: string
  title: string
  content: string
  category: 'DEAL_CLOSED' | 'MEETING_SCHEDULED' | 'POSITIVE_REPLY' | 'SPOTLIGHT' | string
  dealSize?: string | null
  clientNiche?: string | null
  imageUrl?: string | null
  authorName: string
  authorPlan?: string | null
  createdAt?: string
}

interface CommunityWinPopupProps {
  open: boolean
  post: CommunityPopupPost | null
  onClose: () => void
  onViewWin: (postId: string) => void
}

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  DEAL_CLOSED: {
    label: 'Client Deal Closed',
    icon: TrophyIcon,
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  MEETING_SCHEDULED: {
    label: 'Meeting Booked',
    icon: CalendarDaysIcon,
    color: 'bg-accent-mint/15 text-accent-mint border-accent-mint/30',
  },
  POSITIVE_REPLY: {
    label: 'Positive Reply',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-primary/15 text-primary border-primary/30',
  },
  SPOTLIGHT: {
    label: 'Member Spotlight',
    icon: SparklesIcon,
    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
}

export function CommunityWinPopup({
  open,
  post,
  onClose,
  onViewWin,
}: CommunityWinPopupProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open || !post) return null

  const catConfig =
    CATEGORY_LABELS[post.category] || {
      label: 'Verified Member Win',
      icon: SparklesIcon,
      color: 'bg-accent-mint/15 text-accent-mint border-accent-mint/30',
    }
  const CategoryIcon = catConfig.icon

  const handleCelebrateClick = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00F5A0', '#00D9F5', '#FFB800', '#FF4D6D'],
      })
    } catch {
      // Ignore if confetti blocked
    }
    onViewWin(post.id)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-lg bg-surface-elevated/95 border border-accent-mint/30 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-7 space-y-5 ring-1 ring-accent-mint/20"
        >
          {/* Subtle Ambient Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-accent-mint/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent-mint/20 to-primary/20 border border-accent-mint/30 flex items-center justify-center text-accent-mint shadow-lg shadow-accent-mint/10 shrink-0">
                <SparklesIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent-mint">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>New Addition in Community Hub</span>
                </div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Fresh Member Win Just Verified!
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              title="Close popup"
              className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Post Preview Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-surface-container-lowest/80 border border-white/[0.08] space-y-3 relative overflow-hidden">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${catConfig.color}`}
              >
                <CategoryIcon className="w-3.5 h-3.5" />
                <span>{catConfig.label}</span>
              </span>

              {post.dealSize && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {post.dealSize}
                </span>
              )}

              {post.clientNiche && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {post.clientNiche}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-base font-bold text-white tracking-tight leading-snug line-clamp-2">
              {post.title}
            </h4>

            {/* Story Snippet */}
            <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
              {post.content}
            </p>

            {/* Author Footer in Card */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center text-[10px] font-bold text-accent-mint uppercase">
                  {post.authorName.slice(0, 2)}
                </div>
                <span className="font-semibold text-white">{post.authorName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                  {post.authorPlan || 'PRO MEMBER'}
                </span>
              </div>
              <span className="text-[10px] text-accent-mint/90 font-medium">✓ Verified Win</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Maybe Later
            </button>

            <button
              type="button"
              onClick={handleCelebrateClick}
              className="px-5 py-2.5 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-extrabold text-xs transition-all flex items-center gap-2 shadow-lg shadow-accent-mint/25 active:scale-95"
            >
              <span>View in Community Hub</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
