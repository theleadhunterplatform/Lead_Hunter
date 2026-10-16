'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { BoltIcon, SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface CreditExhaustedModalProps {
  open?: boolean
  onClose?: () => void
}

export function CreditExhaustedModal({
  open: controlledOpen,
  onClose: controlledOnClose,
}: CreditExhaustedModalProps = {}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalOpen(false)
    }
  }

  useEffect(() => {
    const handleTrigger = () => {
      setInternalOpen(true)
    }
    window.addEventListener('open-credit-exhausted-modal', handleTrigger)
    return () => {
      window.removeEventListener('open-credit-exhausted-modal', handleTrigger)
    }
  }, [])

  const handleUpgrade = () => {
    handleClose()
    router.push('/settings?tab=billing')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg bg-[#0e131f] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 text-left overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-mint/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          title="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <BoltIcon className="w-3.5 h-3.5" />
            0 Credits Remaining
          </span>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">
          You&apos;ve reached your credit limit
        </h3>
        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
          You need active credits to unlock full decision-maker contact details (direct phone, email, and social profiles). Upgrade your plan to continue hunting high-ticket leads without interruption.
        </p>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-accent-mint/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent-mint">
                  Freelancer
                </span>
                <span className="text-xs font-bold text-white">₹999<span className="text-text-secondary font-normal">/mo</span></span>
              </div>
              <p className="text-lg font-extrabold text-white mt-1">1,000 Credits</p>
              <ul className="text-[11px] text-text-secondary space-y-1.5 mt-3">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="w-3 h-3 text-accent-mint shrink-0" />
                  Direct phone & email unlocks
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="w-3 h-3 text-accent-mint shrink-0" />
                  Real-time high intent feed
                </li>
              </ul>
            </div>
            <button
              onClick={handleUpgrade}
              className="mt-4 w-full py-2 rounded-lg bg-accent-mint/15 hover:bg-accent-mint/25 border border-accent-mint/30 text-accent-mint text-xs font-semibold transition-all"
            >
              Get Freelancer
            </button>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/[0.05] border border-purple-500/20 hover:border-purple-400/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  Agency
                </span>
                <span className="text-xs font-bold text-white">₹2,499<span className="text-text-secondary font-normal">/mo</span></span>
              </div>
              <p className="text-lg font-extrabold text-white mt-1">1,000 Credits</p>
              <ul className="text-[11px] text-text-secondary space-y-1.5 mt-3">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="w-3 h-3 text-purple-400 shrink-0" />
                  Priority 24/7 client signal feed
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="w-3 h-3 text-purple-400 shrink-0" />
                  Full Excel & Sheet exports
                </li>
              </ul>
            </div>
            <button
              onClick={handleUpgrade}
              className="mt-4 w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all"
            >
              Get Agency
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <span className="text-[11px] text-text-secondary">
            Instant credit activation via Razorpay
          </span>
          <button
            onClick={handleClose}
            className="text-xs text-text-secondary hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
