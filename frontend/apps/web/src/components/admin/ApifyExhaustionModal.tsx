'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  KeyIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/solid'

export interface ApifyExhaustionDetail {
  title?: string
  message?: string
  totalKeys?: number
  activeKeys?: number
  totalRemaining?: number
  totalLimit?: number
}

interface Props {
  initialStatus?: ApifyExhaustionDetail | null
}

export function ApifyExhaustionModal({ initialStatus }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [details, setDetails] = useState<ApifyExhaustionDetail | null>(initialStatus || null)

  useEffect(() => {
    if (initialStatus) {
      setDetails(initialStatus)
    }
  }, [initialStatus])

  // Listen to action-triggered events from Keywords, Targets, or any admin action
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<ApifyExhaustionDetail>
      if (customEvent.detail) {
        setDetails((prev) => ({
          ...prev,
          ...customEvent.detail,
        }))
      }
      setIsOpen(true)
    }

    window.addEventListener('show-apify-exhaustion', handleTrigger)
    return () => window.removeEventListener('show-apify-exhaustion', handleTrigger)
  }, [])

  if (!isOpen) return null

  const handleNavigateTokens = () => {
    setIsOpen(false)
    router.push('/admin/tokens')
  }

  const handleDismiss = () => {
    setIsOpen(false)
    try {
      sessionStorage.setItem('apify_exhausted_modal_dismissed', 'true')
    } catch {
      // ignore storage error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0d0f12] border border-amber-500/30 rounded-3xl p-7 shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Header with Warning Beacon */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400" />
            <ExclamationTriangleIcon className="w-6 h-6" />
          </div>

          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-1.5">
              Action Required · Scraping Paused
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {details?.title || 'Apify Scraper Tokens Exhausted'}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-300/90 leading-relaxed mb-6">
          {details?.message ||
            'Your lead collection and enrichment pipeline has paused because all Apify API keys are inactive or have reached their monthly comment scraping limit.'}
        </p>

        {/* Key Quota Metrics Breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-elevated/40 border border-white/[0.05] rounded-xl p-3.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Active Apify Keys
            </span>
            <div className="flex items-center gap-2">
              <ShieldExclamationIcon className="w-4 h-4 text-amber-400" />
              <span className="text-lg font-bold text-white">
                {details?.activeKeys ?? 0}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  / {details?.totalKeys ?? 0}
                </span>
              </span>
            </div>
          </div>

          <div className="bg-surface-elevated/40 border border-white/[0.05] rounded-xl p-3.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Scrapes Remaining
            </span>
            <div className="flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-red-400" />
              <span className="text-lg font-bold text-red-400">
                {details?.totalRemaining ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleNavigateTokens}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-semibold text-sm transition-all shadow-lg shadow-accent-mint/20"
          >
            <KeyIcon className="w-4 h-4" />
            <span>Add / Manage Apify Keys</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-sm font-medium transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
