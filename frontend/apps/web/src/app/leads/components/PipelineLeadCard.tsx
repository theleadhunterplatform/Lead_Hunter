'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BookmarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { AppLead } from '@/types/lead'
import { getFirebaseToken } from '@/lib/firebase'

export default function PipelineLeadCard({
  lead,
  isSelected,
  onClick,
  onSaveToggle,
  onReveal,
}: {
  lead: AppLead
  isSelected?: boolean
  onClick?: () => void
  onSaveToggle?: (isSaved: boolean) => void
  onReveal?: (leadId: string, name: string, email: string, phone?: string | null) => void
}) {
  const router = useRouter()
  const { addToast } = useToast()

  const [isSaved, setIsSaved] = useState(lead.status === 'saved')
  const [isRevealed, setIsRevealed] = useState(lead.isRevealed)

  useEffect(() => {
    setIsSaved(lead.status === 'saved')
  }, [lead.status])

  useEffect(() => {
    setIsRevealed(lead.isRevealed)
  }, [lead.isRevealed])

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newState = !isSaved
    setIsSaved(newState)
    addToast({
      type: 'success',
      message: newState ? '✓ Saved to pipeline' : 'Removed from pipeline',
    })
    if (onSaveToggle) {
      onSaveToggle(newState)
    }
  }

  const handleReveal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!lead.isClaimable) {
      addToast({ type: 'error', message: 'This lead is not yet approved. Intelligence is still being generated.' })
      return
    }
    const token = await getFirebaseToken()
    try {
      const res = await fetch('/api/leads/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        addToast({ type: 'error', message: json.message || json.code || 'Failed to unlock lead' })
        return
      }
      setIsRevealed(true)
      if (onReveal) {
        onReveal(lead.id, json.name, json.email, json.phone)
      }
      addToast({ type: 'success', message: '✓ Contact unlocked' })
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    }
  }

  const handleEngage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!lead.isClaimable) {
      addToast({ type: 'error', message: 'This lead is not yet approved. Intelligence is still being generated.' })
      return
    }
    const token = await getFirebaseToken()
    if (!isRevealed) {
      try {
        const res = await fetch('/api/leads/reveal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ leadId: lead.id }),
        })
        const json = await res.json()
        if (!res.ok) {
          addToast({ type: 'error', message: json.message || json.code || 'Failed to unlock lead' })
          return
        }
        setIsRevealed(true)
        if (onReveal) {
          onReveal(lead.id, json.name, json.email, json.phone)
        }
      } catch {
        addToast({ type: 'error', message: 'Network error' })
        return
      }
    }
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ isSaved: true, status: 'drafting' }),
    })
    router.push(`/outreach?leadId=${lead.id}&autoGenerate=true`)
  }

  // Resolve accent color matching sneak peek page
  const leadAccent =
    lead.urgency === 'critical'
      ? 'pink'
      : lead.urgency === 'high'
        ? 'mint'
        : lead.urgency === 'medium'
          ? 'purple'
          : 'cyan'

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group relative p-6 rounded-3xl transition-all duration-500 flex flex-col justify-between overflow-hidden cursor-pointer ${
        isSelected
          ? 'bg-surface-secondary border border-primary/50 shadow-[0_8px_30px_rgba(var(--rgb-primary),0.12)]'
          : 'bg-surface-secondary/50 border border-white/[0.04] hover:border-white/10 hover:bg-surface-secondary/70 shadow-lg'
      }`}
    >
      {/* Top row: Bookmark & Live Indicator */}
      <div className="flex items-center justify-between mb-5 w-full select-none">
        <button
          onClick={handleSave}
          type="button"
          className={`p-1 rounded-md border transition-all shrink-0 ${
            isSaved
              ? 'bg-primary/20 border-primary/30 text-primary'
              : 'bg-white/5 border-transparent text-text-secondary hover:bg-white/10 hover:text-white'
          }`}
        >
          <BookmarkIcon className={`w-3.5 h-3.5 ${isSaved ? 'text-current' : 'text-text-secondary/35'}`} />
        </button>
        <div className="flex items-center gap-1.5 text-xxs text-text-secondary/40 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse shadow-[0_0_8px_currentColor]" />
          Live
        </div>
      </div>

      {/* Signal Context Quote */}
      <p className="text-sm text-text-primary/90 leading-relaxed mb-5 flex-1 font-light">
        &quot;{lead.signalContext}&quot;
      </p>

      {/* Intent Score Bar */}
      <div className="mb-5 w-full select-none">
        <div className="flex justify-between text-xxs mb-1.5">
          <span className="text-text-secondary/50 font-bold uppercase tracking-widest">
            Intent Score
          </span>
          <span className={`font-bold text-accent-${leadAccent}`}>{lead.replyProbability}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${lead.replyProbability}%` }}
            className={`h-full bg-accent-${leadAccent}/50 rounded-full`}
          />
        </div>
      </div>

      {/* Urgency */}
      <div className="flex items-center justify-between mb-5 w-full select-none">
        <span className="text-xxs text-text-secondary/40 font-bold uppercase tracking-widest">
          Urgency
        </span>
        <span className="text-xxs font-bold uppercase tracking-widest text-text-secondary">
          {lead.urgency}
        </span>
      </div>

      {/* Locked / Revealed Identity Box */}
      {!isRevealed ? (
        <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 overflow-hidden w-full">
          {/* Blurred Content Underneath */}
          <div className="blur-[6px] select-none pointer-events-none">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 rounded-xl bg-accent-${leadAccent}/10 border border-accent-${leadAccent}/20 flex items-center justify-center`}
              >
                <span className={`text-xxs font-bold text-accent-${leadAccent}`}>??</span>
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary">Contact Locked</div>
                <div className="text-xxs text-text-secondary/50">Founder · E-commerce</div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-surface-secondary text-9 font-bold text-text-secondary">
                View Profile
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface-secondary text-9 font-bold text-text-secondary">
                View Context
              </div>
            </div>
          </div>

          {/* Lock Overlay trigger handleReveal */}
          <button
            onClick={handleReveal}
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-2xl cursor-pointer hover:bg-background/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-2">
              <LockClosedIcon className="w-[14px] h-[14px] text-text-secondary/50" />
            </div>
            <span className="text-xxs font-bold text-text-secondary/60 uppercase tracking-widest">
              {lead.revealCost ?? 3} Tokens to Reveal
            </span>
          </button>
        </div>
      ) : (
        <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 overflow-hidden w-full select-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl bg-accent-${leadAccent}/10 border border-accent-${leadAccent}/20 flex items-center justify-center shrink-0`}
              >
                <span className={`text-xs font-bold text-accent-${leadAccent} uppercase`}>
                  {lead.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-primary truncate">{lead.name}</div>
                <div className="text-xxs text-text-secondary/50 truncate">
                  {lead.email} {lead.phone && `• ${lead.phone}`}
                </div>
              </div>
            </div>

            {/* Engage Trigger Button */}
            <button
              onClick={handleEngage}
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase transition-all shrink-0 cursor-pointer"
            >
              Engage
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
